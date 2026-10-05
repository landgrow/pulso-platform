/**
 * Convite de reunião (.ics) — funciona em Google Agenda, Outlook e Apple.
 *
 * Peças puras (sem rede nem banco) para poderem ser testadas. O horário da
 * reunião é gravado como data + hora de São Paulo; o Brasil não tem horário de
 * verão desde 2019, então o deslocamento é fixo em -03:00.
 */

export interface Guest {
  email: string;
  nome: string;
}

export type InviteMethod = "REQUEST" | "CANCEL";

const SP_OFFSET = "-03:00";
const ZONE = "America/Sao_Paulo";

/** "2026-10-06" + "14:30" (ou "14:30:00") → instante UTC. */
export function meetingStartUtc(data: string, hora: string): Date {
  const hhmm = hora.slice(0, 5);
  return new Date(`${data.slice(0, 10)}T${hhmm}:00${SP_OFFSET}`);
}

export function meetingEndUtc(start: Date, duracaoMin: number): Date {
  return new Date(start.getTime() + duracaoMin * 60_000);
}

/** 20261006T173000Z */
export function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/** Linhas do .ics têm no máximo 75 bytes; continuação começa com um espaço. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
      limit = 74; // o espaço inicial da continuação conta
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function safeParam(value: string): string {
  return value.replace(/["\r\n;:,]/g, " ").trim();
}

export interface IcsInput {
  uid: string;
  sequence: number;
  method: InviteMethod;
  titulo: string;
  descricao?: string | null;
  link?: string | null;
  start: Date;
  end: Date;
  organizer: Guest;
  attendees: Guest[];
  now?: Date;
}

export function buildIcs(input: IcsInput): string {
  const cancel = input.method === "CANCEL";
  const lines: (string | null)[] = [
    "BEGIN:VCALENDAR",
    "PRODID:-//Land Grow//PULSO//PT",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    `METHOD:${input.method}`,
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `SEQUENCE:${input.sequence}`,
    `DTSTAMP:${formatIcsDate(input.now ?? new Date())}`,
    `DTSTART:${formatIcsDate(input.start)}`,
    `DTEND:${formatIcsDate(input.end)}`,
    `SUMMARY:${escapeIcsText(input.titulo)}`,
    input.descricao ? `DESCRIPTION:${escapeIcsText(input.descricao)}` : null,
    input.link ? `LOCATION:${escapeIcsText(input.link)}` : null,
    input.link ? `URL:${input.link}` : null,
    `ORGANIZER;CN="${safeParam(input.organizer.nome)}":mailto:${input.organizer.email}`,
    ...input.attendees.map(
      (a) =>
        `ATTENDEE;CN="${safeParam(a.nome || a.email)}";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${a.email}`,
    ),
    `STATUS:${cancel ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return (
    lines
      .filter((l): l is string => l !== null)
      .map(foldIcsLine)
      .join("\r\n") + "\r\n"
  );
}

/** Em que horário de São Paulo cai o início, por extenso, para o texto do e-mail. */
export function formatWhen(start: Date, end: Date): string {
  const day = new Intl.DateTimeFormat("pt-BR", {
    timeZone: ZONE,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(start);
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day}, ${time.format(start)} às ${time.format(end)} (horário de Brasília)`;
}

export function inviteEmailText(input: {
  titulo: string;
  start: Date;
  end: Date;
  link?: string | null;
  organizerName: string;
  method: InviteMethod;
  update?: boolean;
}): { subject: string; text: string } {
  const when = formatWhen(input.start, input.end);
  if (input.method === "CANCEL") {
    return {
      subject: `Cancelada: ${input.titulo}`,
      text: [
        `A reunião "${input.titulo}" foi cancelada.`,
        `Era em: ${when}.`,
        "",
        `Organizada por ${input.organizerName}.`,
        "O arquivo anexo remove o evento da sua agenda.",
      ].join("\n"),
    };
  }
  return {
    subject: `${input.update ? "Convite atualizado" : "Convite"}: ${input.titulo}`,
    text: [
      `${input.organizerName} convidou você para "${input.titulo}".`,
      "",
      `Quando: ${when}`,
      input.link ? `Link: ${input.link}` : null,
      "",
      "Abra o arquivo anexo (convite.ics) e clique em Sim para colocar na sua agenda.",
      "Gmail, Outlook e Apple Calendário mostram os botões Sim / Não / Talvez.",
    ]
      .filter((l): l is string => l !== null)
      .join("\n"),
  };
}

export function reminderEmailText(input: {
  titulo: string;
  start: Date;
  end: Date;
  link?: string | null;
}): { subject: string; text: string } {
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(input.start);
  return {
    subject: `Lembrete: ${input.titulo} começa às ${time}`,
    text: [
      `Sua reunião "${input.titulo}" começa em cerca de 1 hora.`,
      "",
      `Quando: ${formatWhen(input.start, input.end)}`,
      input.link ? `Link: ${input.link}` : null,
    ]
      .filter((l): l is string => l !== null)
      .join("\n"),
  };
}

/** A reunião cai na janela do lembrete? (começa daqui a 0–60 min) */
export function isInReminderWindow(
  start: Date,
  now: Date,
  windowMin = 60,
): boolean {
  const diff = start.getTime() - now.getTime();
  return diff > 0 && diff <= windowMin * 60_000;
}
