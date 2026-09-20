import "server-only";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseNotificationPrefs } from "@/lib/settings/notifications";
import {
  buildEventEmails,
  type CardEventInput,
} from "@/lib/notify/card-events";
import type { NotifyUser } from "@/lib/notify/select-due";
import { deliverEmails } from "@/lib/notify/deliver";

async function loadUser(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  id: string,
): Promise<User | null> {
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || !data.user) return null;
  return data.user;
}

function toNotifyUser(
  user: User,
  opts: {
    isStaff: boolean;
    orgIds: string[];
    prefsRaw: unknown;
  },
): NotifyUser {
  return {
    id: user.id,
    email: user.email ?? "",
    fullName:
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "",
    isStaff: opts.isStaff,
    orgIds: opts.orgIds,
    prefs: parseNotificationPrefs(
      opts.prefsRaw ?? user.user_metadata?.notification_prefs,
    ),
  };
}

/** Dispara e-mail na hora (comentário, arquivo, card do cliente). Falha não quebra o card. */
export async function dispatchCardEvent(event: CardEventInput): Promise<void> {
  try {
    const admin = await createAdminClient();
    const recipientIds = new Set<string>();
    if (event.assigneeId) recipientIds.add(event.assigneeId);

    const [membersRes, rolesRes, assignmentsRes, prefsRes] = await Promise.all([
      admin.from("memberships").select("user_id").eq("org_id", event.orgId),
      admin.from("platform_roles").select("user_id"),
      admin
        .from("consultant_assignments")
        .select("consultant_id")
        .eq("org_id", event.orgId),
      admin.from("notification_prefs").select("*"),
    ]);

    for (const row of membersRes.data ?? []) {
      recipientIds.add((row as { user_id: string }).user_id);
    }
    for (const row of rolesRes.data ?? []) {
      recipientIds.add((row as { user_id: string }).user_id);
    }
    for (const row of assignmentsRes.data ?? []) {
      recipientIds.add((row as { consultant_id: string }).consultant_id);
    }

    const staffIds = new Set(
      (rolesRes.data ?? []).map((r: { user_id: string }) => r.user_id),
    );
    const prefsByUser = new Map<string, unknown>();
    for (const row of prefsRes.data ?? []) {
      const r = row as {
        user_id: string;
        prazo: boolean;
        reuniao: boolean;
        convite_equipe: boolean;
        resumo_diario: boolean;
        comentario?: boolean;
        arquivo?: boolean;
        card_cliente?: boolean;
        cliente_atraso?: boolean;
      };
      prefsByUser.set(r.user_id, {
        prazo: r.prazo,
        reuniao: r.reuniao,
        conviteEquipe: r.convite_equipe,
        resumoDiario: r.resumo_diario,
        comentario: r.comentario,
        arquivo: r.arquivo,
        cardCliente: r.card_cliente,
        clienteAtraso: r.cliente_atraso,
      });
    }

    const users: NotifyUser[] = [];
    for (const id of recipientIds) {
      const authUser = await loadUser(admin, id);
      if (!authUser?.email) continue;
      const orgIds = [event.orgId];
      users.push(
        toNotifyUser(authUser, {
          isStaff: staffIds.has(id),
          orgIds,
          prefsRaw: prefsByUser.get(id),
        }),
      );
    }

    const { fireEventWebhooks, isEventChannelEnabled } =
      await import("@/lib/integrations/runtime");
    await fireEventWebhooks(event.kind, {
      cardId: event.cardId,
      cardTitle: event.cardTitle,
      boardName: event.boardName,
      orgId: event.orgId,
      detail: event.detail,
    });
    if (!(await isEventChannelEnabled(event.kind, "email"))) return;
    const emails = buildEventEmails(users, event);
    if (emails.length === 0) return;
    await deliverEmails(emails);
  } catch (error) {
    console.error("[notify] dispatchCardEvent", error);
  }
}

export async function loadCardEventContext(cardId: string): Promise<{
  cardId: string;
  cardTitle: string;
  boardName: string;
  orgId: string;
  assigneeId: string | null;
} | null> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("board_cards")
    .select("id, titulo, responsavel_id, boards!inner(org_id, name)")
    .eq("id", cardId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    id: string;
    titulo: string;
    responsavel_id: string | null;
    boards:
      { org_id: string; name: string } | { org_id: string; name: string }[];
  };
  const board = Array.isArray(row.boards) ? row.boards[0] : row.boards;
  if (!board) return null;
  return {
    cardId: row.id,
    cardTitle: row.titulo,
    boardName: board.name,
    orgId: board.org_id,
    assigneeId: row.responsavel_id,
  };
}

export async function notifyClientCardChange(
  cardId: string,
  actorId: string | null,
  actorName: string,
  detail: string,
): Promise<void> {
  const ctx = await loadCardEventContext(cardId);
  if (!ctx) return;
  if (!(await actorIsClient(actorId, ctx.orgId))) return;
  await dispatchCardEvent({
    ...ctx,
    actorId,
    actorName,
    kind: "card_cliente",
    detail,
    entityKey: `${cardId}:${Date.now()}`,
  });
}

export async function actorIsClient(
  userId: string | null,
  orgId: string,
): Promise<boolean> {
  if (!userId) return false;
  const admin = await createAdminClient();
  const { data: role } = await admin
    .from("platform_roles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (role) return false;
  const { data: member } = await admin
    .from("memberships")
    .select("user_id")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .maybeSingle();
  return Boolean(member);
}
