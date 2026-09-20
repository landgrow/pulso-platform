import { isClosedColumnLabel } from "@/lib/boards/plano-de-acao-template";
import type { NotificationPrefs } from "@/lib/settings/notifications";

export interface OpenCard {
  id: string;
  titulo: string;
  prazo: string;
  responsavelId: string | null;
  orgId: string;
  boardName: string;
  columnLabel: string;
}

export interface UpcomingMeeting {
  id: string;
  titulo: string;
  data: string;
  orgId: string;
}

export interface NotifyUser {
  id: string;
  email: string;
  fullName: string;
  isStaff: boolean;
  orgIds: string[];
  prefs: NotificationPrefs;
}

function isMineOrStaffUnassigned(card: OpenCard, user: NotifyUser): boolean {
  if (card.responsavelId === user.id) return true;
  if (!card.responsavelId && user.isStaff) return true;
  return false;
}

export function cardsForPrazoEmail(
  cards: OpenCard[],
  user: NotifyUser,
  today: string,
): OpenCard[] {
  if (!user.prefs.prazo) return [];
  return cards.filter((card) => {
    if (isClosedColumnLabel(card.columnLabel)) return false;
    if (card.prazo > today) return false;
    return isMineOrStaffUnassigned(card, user);
  });
}

/** Vence amanhã ou depois de amanhã — aviso ao responsável (e staff se sem dono). */
export function cardsForUpcomingEmail(
  cards: OpenCard[],
  user: NotifyUser,
  today: string,
  horizon: string,
): OpenCard[] {
  if (!user.prefs.prazo) return [];
  return cards.filter((card) => {
    if (isClosedColumnLabel(card.columnLabel)) return false;
    if (card.prazo <= today || card.prazo > horizon) return false;
    return isMineOrStaffUnassigned(card, user);
  });
}

/** Equipe: cliente responsável atrasou a tarefa. */
export function cardsForStaffClientOverdue(
  cards: OpenCard[],
  user: NotifyUser,
  today: string,
  clientUserIds: Set<string>,
): OpenCard[] {
  if (!user.isStaff || !user.prefs.clienteAtraso) return [];
  return cards.filter((card) => {
    if (isClosedColumnLabel(card.columnLabel)) return false;
    if (card.prazo >= today) return false;
    if (!card.responsavelId) return false;
    if (card.responsavelId === user.id) return false;
    if (!clientUserIds.has(card.responsavelId)) return false;
    if (user.orgIds.length === 0) return true;
    return user.orgIds.includes(card.orgId);
  });
}

export function meetingsForReuniaoEmail(
  meetings: UpcomingMeeting[],
  user: NotifyUser,
  today: string,
  tomorrow: string,
): UpcomingMeeting[] {
  if (!user.prefs.reuniao) return [];
  return meetings.filter((meeting) => {
    if (meeting.data !== today && meeting.data !== tomorrow) return false;
    if (user.isStaff && user.orgIds.length === 0) return true;
    return user.orgIds.includes(meeting.orgId);
  });
}

export function digestCounts(
  cards: OpenCard[],
  meetings: UpcomingMeeting[],
  user: NotifyUser,
  today: string,
): { overdue: number; dueToday: number; meetingsToday: number } {
  const mine = cardsForPrazoEmail(
    cards,
    { ...user, prefs: { ...user.prefs, prazo: true } },
    today,
  );
  return {
    overdue: mine.filter((c) => c.prazo < today).length,
    dueToday: mine.filter((c) => c.prazo === today).length,
    meetingsToday: meetingsForReuniaoEmail(
      meetings,
      { ...user, prefs: { ...user.prefs, reuniao: true } },
      today,
      today,
    ).filter((m) => m.data === today).length,
  };
}

export function shouldSendDigest(
  user: NotifyUser,
  digestHour: boolean,
): boolean {
  return user.prefs.resumoDiario && digestHour;
}

export type OutboundKind = "prazo" | "reuniao" | "resumo" | "cliente_atraso";

export interface OutboundEmail {
  userId: string;
  email: string;
  kind: OutboundKind;
  entityKey: string;
  subject: string;
  text: string;
}

export function buildOutboundEmails(input: {
  users: NotifyUser[];
  cards: OpenCard[];
  meetings: UpcomingMeeting[];
  today: string;
  tomorrow: string;
  horizon: string;
  digestHour: boolean;
  clientUserIds: Set<string>;
}): OutboundEmail[] {
  const out: OutboundEmail[] = [];
  for (const user of input.users) {
    if (!user.email) continue;

    const due = cardsForPrazoEmail(input.cards, user, input.today);
    for (const card of due) {
      const atrasado = card.prazo < input.today;
      out.push({
        userId: user.id,
        email: user.email,
        kind: "prazo",
        entityKey: card.id,
        subject: atrasado
          ? `Prazo atrasado: ${card.titulo}`
          : `Prazo hoje: ${card.titulo}`,
        text: [
          `Olá, ${user.fullName || "equipe"}.`,
          "",
          `${atrasado ? "Este card passou do prazo." : "Este card vence hoje."}`,
          `Tarefa: ${card.titulo}`,
          `Kanban: ${card.boardName}`,
          `Coluna: ${card.columnLabel}`,
          `Prazo: ${card.prazo}`,
          "",
          "Abra Atividades no PULSO para atualizar.",
        ].join("\n"),
      });
    }

    const upcoming = cardsForUpcomingEmail(
      input.cards,
      user,
      input.today,
      input.horizon,
    );
    for (const card of upcoming) {
      out.push({
        userId: user.id,
        email: user.email,
        kind: "prazo",
        entityKey: `${card.id}:soon`,
        subject: `Prazo perto: ${card.titulo}`,
        text: [
          `Olá, ${user.fullName || "equipe"}.`,
          "",
          "Este card vence em breve.",
          `Tarefa: ${card.titulo}`,
          `Kanban: ${card.boardName}`,
          `Coluna: ${card.columnLabel}`,
          `Prazo: ${card.prazo}`,
          "",
          "Abra Atividades no PULSO para atualizar.",
        ].join("\n"),
      });
    }

    const clientLate = cardsForStaffClientOverdue(
      input.cards,
      user,
      input.today,
      input.clientUserIds,
    );
    for (const card of clientLate) {
      out.push({
        userId: user.id,
        email: user.email,
        kind: "cliente_atraso",
        entityKey: card.id,
        subject: `Cliente atrasou: ${card.titulo}`,
        text: [
          `Olá, ${user.fullName || "equipe"}.`,
          "",
          "Uma tarefa do cliente passou do prazo.",
          `Tarefa: ${card.titulo}`,
          `Kanban: ${card.boardName}`,
          `Coluna: ${card.columnLabel}`,
          `Prazo: ${card.prazo}`,
          "",
          "Abra Atividades no PULSO.",
        ].join("\n"),
      });
    }

    const reunioes = meetingsForReuniaoEmail(
      input.meetings,
      user,
      input.today,
      input.tomorrow,
    );
    for (const meeting of reunioes) {
      const quando = meeting.data === input.today ? "hoje" : "amanhã";
      out.push({
        userId: user.id,
        email: user.email,
        kind: "reuniao",
        entityKey: meeting.id,
        subject: `Reunião ${quando}: ${meeting.titulo}`,
        text: [
          `Olá, ${user.fullName || "equipe"}.`,
          "",
          `A reunião "${meeting.titulo}" está marcada para ${quando} (${meeting.data}).`,
          "O checklist que for entrega da Land Grow já vira card no kanban.",
        ].join("\n"),
      });
    }

    if (shouldSendDigest(user, input.digestHour)) {
      const counts = digestCounts(
        input.cards,
        input.meetings,
        user,
        input.today,
      );
      out.push({
        userId: user.id,
        email: user.email,
        kind: "resumo",
        entityKey: "daily",
        subject: `Resumo do dia — ${input.today}`,
        text: [
          `Olá, ${user.fullName || "equipe"}.`,
          "",
          `Prazos atrasados: ${counts.overdue}`,
          `Prazos de hoje: ${counts.dueToday}`,
          `Reuniões hoje: ${counts.meetingsToday}`,
          "",
          "Abra o PULSO para o detalhe.",
        ].join("\n"),
      });
    }
  }
  return out;
}
