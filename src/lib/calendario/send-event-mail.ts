import "server-only";

import { sendTransactionalEmail } from "@/lib/notify/send-email";
import {
  buildIcs,
  formatWhen,
  inviteEmailText,
  type Guest,
} from "@/lib/meetings/invite";

export async function sendCalendarEventMail(input: {
  eventId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
  link: string | null;
  location: string | null;
  guests: Guest[];
  organizer: Guest;
  sequence: number;
  method: "REQUEST" | "CANCEL";
  reminder?: boolean;
}): Promise<{
  sent: number;
  skipped: number;
  failed: number;
  error: string | null;
}> {
  if (input.guests.length === 0) {
    return { sent: 0, skipped: 0, failed: 0, error: null };
  }
  const ics = buildIcs({
    uid: `${input.eventId}@pulso.landgrow.com.br`,
    sequence: input.sequence,
    method: input.method,
    titulo: input.title,
    descricao: input.notes,
    link: input.link,
    start: input.startsAt,
    end: input.endsAt,
    organizer: input.organizer,
    attendees: input.guests,
  });
  const copy = input.reminder
    ? {
        subject: `Lembrete: ${input.title} é hoje`,
        text: [
          `Lembrete da agenda: "${input.title}".`,
          "",
          `Quando: ${formatWhen(input.startsAt, input.endsAt)}`,
          input.link ? `Link: ${input.link}` : null,
        ]
          .filter((line): line is string => Boolean(line))
          .join("\n"),
      }
    : inviteEmailText({
        titulo: input.title,
        start: input.startsAt,
        end: input.endsAt,
        link: input.link,
        organizerName: input.organizer.nome,
        method: input.method,
      });
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let error: string | null = null;
  for (const guest of input.guests) {
    const mail: {
      to: string;
      subject: string;
      text: string;
      replyTo: string;
      attachments?: {
        filename: string;
        content: string;
        contentType: string;
      }[];
    } = {
      to: guest.email,
      subject: copy.subject,
      text: [copy.text, input.location ? `Onde: ${input.location}` : null]
        .filter((line): line is string => Boolean(line))
        .join("\n"),
      replyTo: input.organizer.email,
    };
    if (!input.reminder) {
      mail.attachments = [
        {
          filename: "convite.ics",
          content: ics,
          contentType: `text/calendar; charset=utf-8; method=${input.method}`,
        },
      ];
    }
    const result = await sendTransactionalEmail(mail);
    if (result.ok) sent += 1;
    else if (result.skipped) skipped += 1;
    else {
      failed += 1;
      error ??= result.error;
    }
  }
  return { sent, skipped, failed, error };
}
