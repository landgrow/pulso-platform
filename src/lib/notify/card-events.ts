import type { NotificationPrefs } from "@/lib/settings/notifications";
import type { NotifyUser } from "@/lib/notify/select-due";

export type CardEventKind = "comentario" | "arquivo" | "card_cliente";

export interface CardEventInput {
  cardId: string;
  cardTitle: string;
  boardName: string;
  orgId: string;
  assigneeId: string | null;
  actorId: string | null;
  actorName: string;
  kind: CardEventKind;
  detail: string;
  entityKey: string;
}

export interface EventEmail {
  userId: string;
  email: string;
  kind: CardEventKind;
  entityKey: string;
  subject: string;
  text: string;
}

function wantsEvent(user: NotifyUser, kind: CardEventKind): boolean {
  if (kind === "comentario") return user.prefs.comentario;
  if (kind === "arquivo") return user.prefs.arquivo;
  return user.isStaff && user.prefs.cardCliente;
}

function watchesOrg(user: NotifyUser, orgId: string): boolean {
  if (user.isStaff && user.orgIds.length === 0) return true;
  return user.orgIds.includes(orgId);
}

export function recipientsForCardEvent(
  users: NotifyUser[],
  event: CardEventInput,
): NotifyUser[] {
  return users.filter((user) => {
    if (!user.email) return false;
    if (user.id === event.actorId) return false;
    if (!wantsEvent(user, event.kind)) return false;
    if (!watchesOrg(user, event.orgId)) return false;
    if (event.kind === "card_cliente") return user.isStaff;
    const assigned = event.assigneeId === user.id;
    const inOrg = user.orgIds.includes(event.orgId) || user.isStaff;
    return assigned || inOrg;
  });
}

export function buildEventEmails(
  users: NotifyUser[],
  event: CardEventInput,
): EventEmail[] {
  const verb =
    event.kind === "comentario"
      ? "comentou em"
      : event.kind === "arquivo"
        ? "anexou arquivo em"
        : "atualizou";

  return recipientsForCardEvent(users, event).map((user) => ({
    userId: user.id,
    email: user.email,
    kind: event.kind,
    entityKey: event.entityKey,
    subject:
      event.kind === "card_cliente"
        ? `Cliente no card: ${event.cardTitle}`
        : `${event.actorName} ${verb} ${event.cardTitle}`,
    text: [
      `Olá, ${user.fullName || "equipe"}.`,
      "",
      event.kind === "card_cliente"
        ? `${event.actorName} (cliente) criou ou atualizou um card.`
        : `${event.actorName} ${verb} o card.`,
      `Tarefa: ${event.cardTitle}`,
      `Kanban: ${event.boardName}`,
      event.detail ? `Detalhe: ${event.detail}` : "",
      "",
      "Abra Atividades no PULSO.",
    ]
      .filter((line) => line !== "")
      .join("\n"),
  }));
}

export function prefsAllow(
  prefs: NotificationPrefs,
  kind: CardEventKind,
  isStaff: boolean,
): boolean {
  if (kind === "comentario") return prefs.comentario;
  if (kind === "arquivo") return prefs.arquivo;
  return isStaff && prefs.cardCliente;
}
