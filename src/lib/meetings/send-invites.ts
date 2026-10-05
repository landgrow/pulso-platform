import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { dateInSaoPaulo, addDaysIso } from "@/lib/notify/calendar";
import { sendTransactionalEmail } from "@/lib/notify/send-email";
import {
  buildIcs,
  inviteEmailText,
  isInReminderWindow,
  meetingEndUtc,
  meetingStartUtc,
  reminderEmailText,
  type Guest,
  type InviteMethod,
} from "@/lib/meetings/invite";

type Admin = Awaited<ReturnType<typeof createAdminClient>>;

export interface InviteMeeting {
  id: string;
  titulo: string;
  data: string;
  hora_inicio: string;
  duracao_min: number;
  link: string | null;
  resumo?: string | null;
  convidados: Guest[];
  ics_sequence: number;
}

export interface SendSummary {
  sent: number;
  failed: number;
  /** Sem chave do Resend: nada foi enviado e nada foi fingido. */
  skipped: number;
  firstError: string | null;
}

/** Quem está marcando a reunião; é o remetente lógico do convite (RSVP volta pra pessoa). */
export type Organizer = Guest;

/** Envia o convite (ou cancelamento) para cada convidado, um e-mail por pessoa. */
export async function sendInvites(
  meeting: InviteMeeting,
  method: InviteMethod,
  organizer: Organizer,
  opts: { update?: boolean } = {},
): Promise<SendSummary> {
  const start = meetingStartUtc(meeting.data, meeting.hora_inicio);
  const end = meetingEndUtc(start, meeting.duracao_min);
  const ics = buildIcs({
    uid: `${meeting.id}@pulso.landgrow.com.br`,
    sequence: meeting.ics_sequence,
    method,
    titulo: meeting.titulo,
    descricao: meeting.resumo ?? null,
    link: meeting.link,
    start,
    end,
    organizer,
    attendees: meeting.convidados,
  });
  const text = inviteEmailText({
    titulo: meeting.titulo,
    start,
    end,
    link: meeting.link,
    organizerName: organizer.nome,
    method,
    ...(opts.update ? { update: true } : {}),
  });

  const summary: SendSummary = {
    sent: 0,
    failed: 0,
    skipped: 0,
    firstError: null,
  };
  for (const guest of meeting.convidados) {
    const result = await sendTransactionalEmail({
      to: guest.email,
      subject: text.subject,
      text: text.text,
      replyTo: organizer.email,
      attachments: [
        {
          filename: "convite.ics",
          content: ics,
          contentType: `text/calendar; charset=utf-8; method=${method}`,
        },
      ],
    });
    if (result.ok) summary.sent += 1;
    else if (result.skipped) summary.skipped += 1;
    else {
      summary.failed += 1;
      summary.firstError ??= result.error;
    }
  }
  return summary;
}

export interface ReminderResult {
  checked: number;
  sent: number;
  failed: number;
}

/**
 * Lembrete de 1h antes. Roda a cada execução do cron: pega as reuniões de hoje
 * (e de amanhã, por causa da virada do dia) que começam daqui a 0–60 min e
 * ainda não foram lembradas. A reunião é "reservada" antes do envio, então duas
 * execuções seguidas nunca mandam o mesmo lembrete duas vezes.
 */
export async function sendMeetingReminders(
  now: Date = new Date(),
  admin?: Admin,
): Promise<ReminderResult> {
  const db = admin ?? (await createAdminClient());
  const today = dateInSaoPaulo(now);
  const { data, error } = await db
    .from("meetings")
    .select("id, titulo, data, hora_inicio, duracao_min, link, convidados")
    .not("hora_inicio", "is", null)
    .is("lembrete_enviado_at", null)
    .in("data", [today, addDaysIso(today, 1)]);
  // Sem a migração 0035 as colunas não existem: não há o que lembrar.
  if (error) return { checked: 0, sent: 0, failed: 0 };

  const result: ReminderResult = { checked: 0, sent: 0, failed: 0 };
  for (const row of (data ?? []) as {
    id: string;
    titulo: string;
    data: string;
    hora_inicio: string;
    duracao_min: number | null;
    link: string | null;
    convidados: Guest[] | null;
  }[]) {
    const guests = row.convidados ?? [];
    if (guests.length === 0) continue;
    const start = meetingStartUtc(row.data, row.hora_inicio);
    if (!isInReminderWindow(start, now)) continue;
    result.checked += 1;

    const { data: claimed } = await db
      .from("meetings")
      .update({ lembrete_enviado_at: now.toISOString() })
      .eq("id", row.id)
      .is("lembrete_enviado_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const end = meetingEndUtc(start, row.duracao_min ?? 60);
    const text = reminderEmailText({
      titulo: row.titulo,
      start,
      end,
      link: row.link,
    });
    let sent = 0;
    for (const guest of guests) {
      const r = await sendTransactionalEmail({
        to: guest.email,
        subject: text.subject,
        text: text.text,
      });
      if (r.ok) sent += 1;
    }
    result.sent += sent;
    if (sent === 0) {
      // Nada saiu (sem chave ou erro): libera para tentar no próximo ciclo.
      result.failed += 1;
      await db
        .from("meetings")
        .update({ lembrete_enviado_at: null })
        .eq("id", row.id);
    }
  }
  return result;
}
