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

/** Chave única do e-mail de prazos: só um a cada 23h por pessoa. */
export const PRAZOS_ENTITY_KEY = "prazos";
const MAX_ITEMS_PER_SECTION = 15;

function pushSection(lines: string[], title: string, cards: OpenCard[]): void {
  if (cards.length === 0) return;
  lines.push(`${title} (${cards.length}):`);
  for (const card of cards.slice(0, MAX_ITEMS_PER_SECTION)) {
    lines.push(`- ${card.titulo} · ${card.boardName} · prazo ${card.prazo}`);
  }
  if (cards.length > MAX_ITEMS_PER_SECTION) {
    lines.push(`- e mais ${cards.length - MAX_ITEMS_PER_SECTION}`);
  }
  lines.push("");
}

function prazosSubject(atrasadas: number, hoje: number, breve: number): string {
  const parts: string[] = [];
  if (atrasadas > 0)
    parts.push(`${atrasadas} atrasada${atrasadas === 1 ? "" : "s"}`);
  if (hoje > 0) parts.push(`${hoje} para hoje`);
  if (parts.length === 0) parts.push(`${breve} vencendo em breve`);
  return `Prazos: ${parts.join(", ")}`;
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

    // Um único e-mail de prazos por pessoa (antes saía um por tarefa, todo dia).
    const due = cardsForPrazoEmail(input.cards, user, input.today);
    const upcoming = cardsForUpcomingEmail(
      input.cards,
      user,
      input.today,
      input.horizon,
    );
    const clientLate = cardsForStaffClientOverdue(
      input.cards,
      user,
      input.today,
      input.clientUserIds,
    );
    const atrasados = due.filter((card) => card.prazo < input.today);
    const hoje = due.filter((card) => card.prazo >= input.today);
    const sections: string[] = [];
    pushSection(sections, "Atrasadas", atrasados);
    pushSection(sections, "Vencem hoje", hoje);
    pushSection(sections, "Vencem em breve", upcoming);
    pushSection(sections, "Atrasadas do cliente", clientLate);
    if (sections.length > 0) {
      out.push({
        userId: user.id,
        email: user.email,
        kind: "prazo",
        entityKey: PRAZOS_ENTITY_KEY,
        subject: prazosSubject(
          atrasados.length + clientLate.length,
          hoje.length,
          upcoming.length,
        ),
        text: [
          `Olá, ${user.fullName || "equipe"}.`,
          "",
          ...sections,
          "Abra Atividades no PULSO para atualizar.",
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
