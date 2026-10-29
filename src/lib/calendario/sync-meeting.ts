import type { createAdminClient } from "@/lib/supabase/admin";
import { saoPauloDateTime } from "@/lib/notify/calendar";
import type { CalendarGuest } from "@/lib/calendario/model";

type Admin = Awaited<ReturnType<typeof createAdminClient>>;

export function shouldOpenMeetingRecord(input: {
  kind: string;
  orgId: string | null;
  calendarSlug: string | null;
}): boolean {
  if (input.orgId) return true;
  const kind = input.kind.toLowerCase();
  if (kind === "reuniao" || kind === "call") return true;
  return input.calendarSlug === "reunioes";
}

function meetingLink(link: string | null): string | null {
  if (!link) return null;
  return /^https?:\/\//i.test(link) ? link : null;
}

function clockWithSeconds(time: string): string {
  const hhmm = time.slice(0, 5);
  return `${hhmm}:00`;
}

export async function internalOrgId(admin: Admin): Promise<string | null> {
  const { data } = await admin
    .from("organizations")
    .select("id")
    .eq("is_internal", true)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function reunioesCalendarId(admin: Admin): Promise<string | null> {
  const { data } = await admin
    .from("staff_calendar_calendars")
    .select("id")
    .eq("slug", "reunioes")
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function upsertMeetingFromCalendarEvent(
  admin: Admin,
  input: {
    eventId: string;
    meetingId: string | null;
    title: string;
    date: string;
    time: string | null;
    durationMin: number;
    allDay: boolean;
    orgId: string | null;
    link: string | null;
    notes: string | null;
    guests: CalendarGuest[];
    createdBy: string;
  },
): Promise<string | null> {
  const orgId = input.orgId ?? (await internalOrgId(admin));
  if (!orgId) return null;
  const hora =
    input.allDay || !input.time ? null : clockWithSeconds(input.time);
  const convidados = input.guests.map((guest) => ({
    email: guest.email,
    nome: guest.name,
  }));
  const row: Record<string, unknown> = {
    org_id: orgId,
    titulo: input.title,
    data: input.date,
    hora_inicio: hora,
    duracao_min: hora ? input.durationMin : null,
    link: meetingLink(input.link),
    convidados,
    participantes: convidados.map((guest) => guest.nome || guest.email),
  };
  if (input.notes) row.resumo = input.notes;

  if (input.meetingId) {
    const { error } = await admin
      .from("meetings")
      .update(row)
      .eq("id", input.meetingId);
    if (error) return input.meetingId;
    await admin
      .from("staff_calendar_events")
      .update({ meeting_id: input.meetingId, org_id: orgId })
      .eq("id", input.eventId);
    return input.meetingId;
  }

  row.created_by = input.createdBy;
  const { data, error } = await admin
    .from("meetings")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return null;
  const meetingId = data.id as string;
  await admin
    .from("staff_calendar_events")
    .update({ meeting_id: meetingId, org_id: orgId })
    .eq("id", input.eventId);
  return meetingId;
}

export async function upsertCalendarFromMeeting(
  admin: Admin,
  input: {
    meetingId: string;
    orgId: string;
    title: string;
    date: string;
    time: string | null;
    durationMin: number;
    link: string | null;
    notes: string | null;
    guests: CalendarGuest[];
    createdBy: string;
  },
): Promise<void> {
  const { data: existing } = await admin
    .from("staff_calendar_events")
    .select("id")
    .eq("meeting_id", input.meetingId)
    .maybeSingle();
  const allDay = !input.time;
  const start = saoPauloDateTime(
    input.date,
    input.time ? clockWithSeconds(input.time) : "00:00:00",
  );
  const end = allDay
    ? saoPauloDateTime(input.date, "23:59:00")
    : new Date(start.getTime() + input.durationMin * 60_000);
  const calendarId = await reunioesCalendarId(admin);
  const row: Record<string, unknown> = {
    title: input.title,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    kind: "reuniao",
    org_id: input.orgId,
    meeting_id: input.meetingId,
    all_day: allDay,
    guests: input.guests,
    link: input.link,
    notes: input.notes,
  };
  if (calendarId) row.calendar_id = calendarId;
  if (existing?.id) {
    await admin.from("staff_calendar_events").update(row).eq("id", existing.id);
    return;
  }
  row.created_by = input.createdBy;
  await admin.from("staff_calendar_events").insert(row);
}
