import "server-only";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/settings/notifications";
import {
  addDaysIso,
  dateInSaoPaulo,
  isDigestHour,
} from "@/lib/notify/calendar";
import {
  buildOutboundEmails,
  type NotifyUser,
  type OpenCard,
  type UpcomingMeeting,
} from "@/lib/notify/select-due";
import { sendTransactionalEmail } from "@/lib/notify/send-email";

export interface NotificationJobResult {
  scannedUsers: number;
  candidates: number;
  sent: number;
  skippedDuplicate: number;
  skippedNoProvider: number;
  failed: number;
}

async function listAuthUsers(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
): Promise<User[]> {
  const users: User[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(error.message);
    users.push(...(data.users ?? []));
    if ((data.users ?? []).length < 200) break;
    page += 1;
    if (page > 20) break;
  }
  return users;
}

export async function runNotificationJob(
  now: Date = new Date(),
): Promise<NotificationJobResult> {
  const admin = await createAdminClient();
  const today = dateInSaoPaulo(now);
  const tomorrow = addDaysIso(today, 1);
  const digestHour = isDigestHour(now);

  const [authUsers, prefsRes, rolesRes, membersRes, cardsRes, meetingsRes] =
    await Promise.all([
      listAuthUsers(admin),
      admin.from("notification_prefs").select("*"),
      admin.from("platform_roles").select("user_id, role"),
      admin.from("memberships").select("user_id, org_id"),
      admin
        .from("board_cards")
        .select(
          "id, titulo, prazo, responsavel_id, board_id, boards!inner(org_id, name), board_columns!inner(label)",
        )
        .not("prazo", "is", null)
        .lte("prazo", today),
      admin
        .from("meetings")
        .select("id, titulo, data, org_id")
        .in("data", [today, tomorrow]),
    ]);

  const prefsByUser = new Map<string, NotificationPrefs>();
  for (const row of prefsRes.data ?? []) {
    const r = row as {
      user_id: string;
      prazo: boolean;
      reuniao: boolean;
      convite_equipe: boolean;
      resumo_diario: boolean;
    };
    prefsByUser.set(r.user_id, {
      prazo: r.prazo,
      reuniao: r.reuniao,
      conviteEquipe: r.convite_equipe,
      resumoDiario: r.resumo_diario,
    });
  }

  const staffIds = new Set(
    (rolesRes.data ?? []).map((r: { user_id: string }) => r.user_id),
  );
  const orgIdsByUser = new Map<string, string[]>();
  for (const row of membersRes.data ?? []) {
    const m = row as { user_id: string; org_id: string };
    const list = orgIdsByUser.get(m.user_id) ?? [];
    list.push(m.org_id);
    orgIdsByUser.set(m.user_id, list);
  }

  const users: NotifyUser[] = authUsers
    .filter((u) => Boolean(u.email))
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      fullName:
        (u.user_metadata?.full_name as string | undefined) ??
        u.email?.split("@")[0] ??
        "",
      isStaff: staffIds.has(u.id),
      orgIds: orgIdsByUser.get(u.id) ?? [],
      prefs:
        prefsByUser.get(u.id) ??
        parseNotificationPrefs(u.user_metadata?.notification_prefs),
    }));

  const cards: OpenCard[] = (cardsRes.data ?? [])
    .map((row) => {
      const r = row as {
        id: string;
        titulo: string;
        prazo: string;
        responsavel_id: string | null;
        boards:
          { org_id: string; name: string } | { org_id: string; name: string }[];
        board_columns: { label: string } | { label: string }[];
      };
      const board = Array.isArray(r.boards) ? r.boards[0] : r.boards;
      const column = Array.isArray(r.board_columns)
        ? r.board_columns[0]
        : r.board_columns;
      if (!board || !column) return null;
      return {
        id: r.id,
        titulo: r.titulo,
        prazo: r.prazo,
        responsavelId: r.responsavel_id,
        orgId: board.org_id,
        boardName: board.name,
        columnLabel: column.label,
      };
    })
    .filter((card): card is OpenCard => card !== null);

  const meetings: UpcomingMeeting[] = (meetingsRes.data ?? []).map((row) => {
    const r = row as {
      id: string;
      titulo: string;
      data: string;
      org_id: string;
    };
    return {
      id: r.id,
      titulo: r.titulo,
      data: typeof r.data === "string" ? r.data.slice(0, 10) : r.data,
      orgId: r.org_id,
    };
  });

  const outbound = buildOutboundEmails({
    users,
    cards,
    meetings,
    today,
    tomorrow,
    digestHour,
  });

  const result: NotificationJobResult = {
    scannedUsers: users.length,
    candidates: outbound.length,
    sent: 0,
    skippedDuplicate: 0,
    skippedNoProvider: 0,
    failed: 0,
  };

  for (const item of outbound) {
    const { error: dupError } = await admin
      .from("notification_deliveries")
      .insert({
        user_id: item.userId,
        kind: item.kind,
        entity_key: item.entityKey,
        day: today,
      });

    if (dupError) {
      result.skippedDuplicate += 1;
      continue;
    }

    const sent = await sendTransactionalEmail({
      to: item.email,
      subject: item.subject,
      text: item.text,
    });

    if (sent.ok) {
      result.sent += 1;
      continue;
    }

    await admin
      .from("notification_deliveries")
      .delete()
      .eq("user_id", item.userId)
      .eq("kind", item.kind)
      .eq("entity_key", item.entityKey)
      .eq("day", today);

    if (sent.skipped) result.skippedNoProvider += 1;
    else result.failed += 1;
  }

  return result;
}
