import "server-only";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseNotificationPrefs } from "@/lib/settings/notifications";
import { buildBinEmails, type BinNotifyInput } from "@/lib/notify/bin-events";
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
  opts: { isStaff: boolean; orgIds: string[]; prefsRaw: unknown },
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

/** E-mail para a equipe Land Grow. Falha não desfaz o envio do cliente. */
export async function dispatchBinEvent(event: BinNotifyInput): Promise<void> {
  try {
    const admin = await createAdminClient();
    const recipientIds = new Set<string>();

    const [rolesRes, assignmentsRes, prefsRes] = await Promise.all([
      admin.from("platform_roles").select("user_id"),
      admin
        .from("consultant_assignments")
        .select("consultant_id")
        .eq("org_id", event.orgId),
      admin.from("notification_prefs").select("*"),
    ]);

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
        bin_cliente?: boolean;
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
        binCliente: r.bin_cliente,
      });
    }

    const users: NotifyUser[] = [];
    for (const id of recipientIds) {
      const authUser = await loadUser(admin, id);
      if (!authUser?.email) continue;
      users.push(
        toNotifyUser(authUser, {
          isStaff: staffIds.has(id),
          orgIds: staffIds.has(id) ? [] : [event.orgId],
          prefsRaw: prefsByUser.get(id),
        }),
      );
    }

    const emails = buildBinEmails(users, event);
    if (emails.length === 0) return;
    await deliverEmails(emails);
  } catch (error) {
    console.error("[notify] dispatchBinEvent", error);
  }
}
