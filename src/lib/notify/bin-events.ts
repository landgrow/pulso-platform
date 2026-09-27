import type { NotificationPrefs } from "@/lib/settings/notifications";
import type { NotifyUser } from "@/lib/notify/select-due";
import type { BinEventKind } from "@/lib/bin-v2/flow";

export interface BinNotifyInput {
  orgId: string;
  orgName: string;
  orgSlug: string;
  actorId: string | null;
  actorName: string;
  kind: BinEventKind;
  sectionTitle?: string;
  routeLabel: string;
  entityKey: string;
  href: string;
}

export interface BinNotifyEmail {
  userId: string;
  email: string;
  kind: string;
  entityKey: string;
  subject: string;
  text: string;
}

export function wantsBinEmail(
  prefs: NotificationPrefs,
  isStaff: boolean,
): boolean {
  return isStaff && prefs.binCliente;
}

export function recipientsForBinEvent(
  users: NotifyUser[],
  event: BinNotifyInput,
): NotifyUser[] {
  return users.filter((user) => {
    if (!user.email) return false;
    if (!user.isStaff) return false;
    if (user.id === event.actorId) return false;
    if (!wantsBinEmail(user.prefs, user.isStaff)) return false;
    if (user.orgIds.length === 0) return true;
    return user.orgIds.includes(event.orgId);
  });
}

export function buildBinEmails(
  users: NotifyUser[],
  event: BinNotifyInput,
): BinNotifyEmail[] {
  const what =
    event.kind === "geral"
      ? `enviou o diagnóstico geral do BIN. Categoria: ${event.routeLabel}.`
      : event.kind === "setor"
        ? `concluiu o setor ${event.sectionTitle ?? "do BIN"} (${event.routeLabel}).`
        : `enviou o BIN completo de ${event.routeLabel}. Dá para começar o diagnóstico.`;

  const subject =
    event.kind === "geral"
      ? `BIN · ${event.orgName} enviou o diagnóstico geral`
      : event.kind === "setor"
        ? `BIN · ${event.orgName} concluiu ${event.sectionTitle ?? "um setor"}`
        : `BIN · ${event.orgName} enviou o diagnóstico completo`;

  return recipientsForBinEvent(users, event).map((user) => ({
    userId: user.id,
    email: user.email,
    kind: `bin_${event.kind}`,
    entityKey: event.entityKey,
    subject,
    text: [
      `Olá, ${user.fullName || "equipe"}.`,
      "",
      `${event.actorName} (${event.orgName}) ${what}`,
      "",
      "As respostas estão na ficha do cliente no PULSO — é dali que a Land Grow faz o diagnóstico.",
      event.href,
    ].join("\n"),
  }));
}
