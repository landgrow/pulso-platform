"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAnyCapability } from "@/lib/supabase/platform-role-server";
import { getRequestUser } from "@/lib/supabase/request-user";
import {
  addDaysIso,
  dateInSaoPaulo,
  saoPauloDateTime,
} from "@/lib/notify/calendar";
import { staffDisplayName } from "@/lib/sala/dm";
import { authorizeOrg } from "@/lib/auth/org-access";
import { parseGuests, slugifyLabel } from "@/lib/calendario/model";
import { sendCalendarEventMail } from "@/lib/calendario/send-event-mail";
import { CALENDAR_COLORS } from "@/lib/calendario/model";
import {
  shouldOpenMeetingRecord,
  upsertMeetingFromCalendarEvent,
} from "@/lib/calendario/sync-meeting";
import type {
  CalendarAgenda,
  CalendarBook,
  CalendarClient,
  CalendarEvent,
  CalendarStaff,
  CalendarType,
} from "@/types/calendar";

type Result<T> = { success: true; data: T } | { success: false; error: string };
type Admin = Awaited<ReturnType<typeof createAdminClient>>;

const EVENT_COLS =
  "id, title, starts_at, ends_at, kind, org_id, meeting_id, channel_id, link, notes, calendar_id, location, guests, all_day, remind_minutes, ics_sequence";

async function requireAgenda(): Promise<
  { ok: true; userId: string; admin: Admin } | { ok: false; error: string }
> {
  const supabase = await createClient();
  try {
    await requireAnyCapability(supabase, ["calendario", "sala", "atividades"]);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Acesso negado.",
    };
  }
  const user = await getRequestUser();
  if (!user) return { ok: false, error: "Sessão expirada." };
  return { ok: true, userId: user.id, admin: await createAdminClient() };
}

async function requireCalendarAccess(
  orgId?: string,
  write = false,
): Promise<
  | { ok: true; userId: string; admin: Admin; orgId: string | null }
  | { ok: false; error: string }
> {
  if (orgId) {
    const auth = await authorizeOrg(orgId, write ? { write: true } : {});
    if (!auth.ok) return auth;
    return {
      ok: true,
      userId: auth.access.user.id,
      admin: await createAdminClient(),
      orgId,
    };
  }
  const gate = await requireAgenda();
  if (!gate.ok) return gate;
  return { ok: true, userId: gate.userId, admin: gate.admin, orgId: null };
}

function mapBook(row: {
  id: string;
  name: string;
  color: string;
  slug: string;
  is_system: boolean;
  source_key: string | null;
}): CalendarBook {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    slug: row.slug,
    isSystem: row.is_system,
    sourceKey: row.source_key,
  };
}

async function loadBooks(admin: Admin): Promise<CalendarBook[]> {
  const { data } = await admin
    .from("staff_calendar_calendars")
    .select("id, name, color, slug, is_system, source_key")
    .order("sort", { ascending: true });
  return (data ?? []).map((row) =>
    mapBook(
      row as {
        id: string;
        name: string;
        color: string;
        slug: string;
        is_system: boolean;
        source_key: string | null;
      },
    ),
  );
}

async function loadTypes(admin: Admin): Promise<CalendarType[]> {
  const { data } = await admin
    .from("staff_calendar_types")
    .select("id, name, slug, is_system")
    .order("created_at", { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    isSystem: Boolean(row.is_system),
  }));
}

async function loadStaff(admin: Admin): Promise<CalendarStaff[]> {
  const { data: roles } = await admin
    .from("platform_roles")
    .select("user_id")
    .in("role", ["platform_admin", "consultant"]);
  const ids = [...new Set((roles ?? []).map((row) => row.user_id as string))];
  if (ids.length === 0) return [];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);
  const names = new Map(
    (profiles ?? []).map((row) => [
      row.id as string,
      staffDisplayName(row.full_name as string | null),
    ]),
  );
  const staff: CalendarStaff[] = [];
  for (const userId of ids) {
    const { data } = await admin.auth.admin.getUserById(userId);
    const email = data.user?.email?.trim().toLowerCase() ?? "";
    if (!email) continue;
    staff.push({
      userId,
      email,
      name: names.get(userId) ?? email.split("@")[0] ?? email,
    });
  }
  return staff.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function mapEvent(
  row: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    kind: string;
    org_id: string | null;
    meeting_id: string | null;
    channel_id: string | null;
    link: string | null;
    notes: string | null;
    calendar_id: string | null;
    location: string | null;
    guests: unknown;
    all_day: boolean | null;
    remind_minutes: number | null;
  },
  books: CalendarBook[],
  orgName: string | null,
  source: CalendarEvent["source"],
): CalendarEvent {
  const book = books.find((item) => item.id === row.calendar_id) ?? null;
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    kind: row.kind || "interno",
    calendarId: row.calendar_id,
    calendarSlug: book?.slug ?? null,
    color: book?.color ?? "#26304d",
    orgId: row.org_id,
    orgName,
    meetingId: row.meeting_id,
    channelId: row.channel_id,
    link: row.link,
    notes: row.notes,
    location: row.location,
    guests: parseGuests(row.guests),
    remindMinutes: row.remind_minutes,
    source,
    allDay: Boolean(row.all_day),
    editable: source === "calendar",
  };
}

async function loadClients(admin: Admin): Promise<CalendarClient[]> {
  const { data } = await admin
    .from("organizations")
    .select("id, name, slug")
    .eq("is_internal", false)
    .is("deleted_at", null)
    .order("name");
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
  }));
}

export async function listCalendarAgenda(
  from = dateInSaoPaulo(),
  days = 14,
  orgId?: string,
): Promise<Result<CalendarAgenda>> {
  const gate = await requireCalendarAccess(orgId);
  if (!gate.ok) return { success: false, error: gate.error };
  const to = addDaysIso(from, days);
  const { admin, userId } = gate;
  const [books, types, staff, clients] = await Promise.all([
    loadBooks(admin),
    loadTypes(admin),
    gate.orgId ? Promise.resolve([] as CalendarStaff[]) : loadStaff(admin),
    gate.orgId ? Promise.resolve([] as CalendarClient[]) : loadClients(admin),
  ]);

  let eventsQuery = admin
    .from("staff_calendar_events")
    .select(EVENT_COLS)
    .gte("starts_at", `${from}T00:00:00-03:00`)
    .lte("starts_at", `${to}T23:59:59-03:00`)
    .order("starts_at", { ascending: true });
  if (gate.orgId) eventsQuery = eventsQuery.eq("org_id", gate.orgId);

  let meetingsQuery = admin
    .from("meetings")
    .select("id, titulo, data, hora_inicio, duracao_min, link, org_id, resumo")
    .gte("data", from)
    .lte("data", to)
    .order("data", { ascending: true });
  if (gate.orgId) meetingsQuery = meetingsQuery.eq("org_id", gate.orgId);

  const [
    { data: profile },
    { data: eventRows },
    { data: meetings },
    { data: orgs },
  ] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    eventsQuery,
    meetingsQuery,
    admin.from("organizations").select("id, name"),
  ]);

  const orgName = new Map(
    (orgs ?? []).map((row) => [row.id as string, row.name as string]),
  );
  const events: CalendarEvent[] = [];
  const meetingIds = new Set<string>();
  const reunioes = books.find((item) => item.slug === "reunioes");

  for (const row of eventRows ?? []) {
    if (row.meeting_id) meetingIds.add(row.meeting_id as string);
    events.push(
      mapEvent(
        row as Parameters<typeof mapEvent>[0],
        books,
        orgName.get(row.org_id as string) ?? null,
        "calendar",
      ),
    );
  }

  for (const row of meetings ?? []) {
    const id = row.id as string;
    if (meetingIds.has(id)) continue;
    const start = saoPauloDateTime(
      String(row.data).slice(0, 10),
      (row.hora_inicio as string | null) ?? "09:00:00",
    );
    const duration = Number(row.duracao_min ?? 60);
    const end = new Date(start.getTime() + duration * 60_000);
    events.push({
      id: `meeting:${id}`,
      title: row.titulo as string,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      kind: "reuniao",
      calendarId: reunioes?.id ?? null,
      calendarSlug: "reunioes",
      color: reunioes?.color ?? "#4f46e5",
      orgId: (row.org_id as string | null) ?? null,
      orgName: orgName.get(row.org_id as string) ?? null,
      meetingId: id,
      channelId: null,
      link: (row.link as string | null) ?? null,
      notes: (row.resumo as string | null) ?? null,
      location: null,
      guests: [],
      remindMinutes: null,
      source: "meeting",
      allDay: false,
      editable: false,
    });
  }

  events.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return {
    success: true,
    data: {
      today: from,
      greetingName:
        staffDisplayName(profile?.full_name as string | null, "equipe").split(
          " ",
        )[0] ?? "equipe",
      events,
      calendars: books,
      types,
      staff,
      clients,
    },
  };
}

const eventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(160),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  durationMin: z.number().int().min(15).max(720).default(60),
  allDay: z.boolean().optional(),
  kind: z.string().trim().min(2).max(40).default("interno"),
  calendarId: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  link: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(4000).optional(),
  location: z.string().trim().max(300).optional(),
  guests: z.unknown().optional(),
  remindMinutes: z.number().int().min(0).max(10080).nullable().optional(),
  sendInvite: z.boolean().optional(),
  postToSala: z.boolean().optional(),
  channelId: z.string().uuid().optional(),
});

async function revalidateCalendarSurfaces(
  admin: Admin,
  orgId: string | null,
): Promise<void> {
  revalidatePath("/admin/calendario");
  revalidatePath("/admin/reunioes");
  if (!orgId) return;
  const { data } = await admin
    .from("organizations")
    .select("slug")
    .eq("id", orgId)
    .maybeSingle();
  if (data?.slug) {
    revalidatePath(`/clientes/${data.slug as string}/calendario`);
    revalidatePath(`/clientes/${data.slug as string}/reunioes`);
  }
}

async function organizerOf(
  admin: Admin,
  userId: string,
): Promise<{ email: string; nome: string } | null> {
  const [{ data: profile }, { data: auth }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);
  const email = auth.user?.email?.trim() ?? "";
  if (!email) return null;
  return {
    email,
    nome: staffDisplayName(
      profile?.full_name as string | null,
      email.split("@")[0] ?? "PULSO",
    ),
  };
}

async function persistEvent(
  gate: { userId: string; admin: Admin },
  parsed: z.infer<typeof eventSchema>,
  existingId: string | null,
): Promise<Result<CalendarEvent>> {
  const allDay = parsed.allDay === true;
  const start = allDay
    ? saoPauloDateTime(parsed.date, "00:00:00")
    : saoPauloDateTime(parsed.date, `${parsed.time ?? "09:00"}:00`);
  const end = allDay
    ? saoPauloDateTime(parsed.date, "23:59:00")
    : new Date(start.getTime() + parsed.durationMin * 60_000);
  const guests = parseGuests(parsed.guests);
  const insert: Record<string, unknown> = {
    title: parsed.title,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    kind: parsed.kind,
    all_day: allDay,
    guests,
  };
  if (!existingId) insert.created_by = gate.userId;
  if (parsed.calendarId) insert.calendar_id = parsed.calendarId;
  if (parsed.link) insert.link = parsed.link;
  else insert.link = null;
  if (parsed.notes) insert.notes = parsed.notes;
  else insert.notes = null;
  if (parsed.location) insert.location = parsed.location;
  else insert.location = null;
  if (parsed.remindMinutes != null)
    insert.remind_minutes = parsed.remindMinutes;
  else insert.remind_minutes = null;
  if (parsed.channelId) insert.channel_id = parsed.channelId;
  if (parsed.orgId) insert.org_id = parsed.orgId;
  else insert.org_id = null;

  let row: Record<string, unknown> | null = null;
  if (existingId) {
    const { data, error } = await gate.admin
      .from("staff_calendar_events")
      .update(insert)
      .eq("id", existingId)
      .select(EVENT_COLS)
      .single();
    if (error || !data) {
      return {
        success: false,
        error: error?.message ?? "Não atualizei o horário.",
      };
    }
    row = data as Record<string, unknown>;
  } else {
    const { data, error } = await gate.admin
      .from("staff_calendar_events")
      .insert(insert)
      .select(EVENT_COLS)
      .single();
    if (error || !data) {
      return {
        success: false,
        error: error?.message ?? "Não foi possível criar o horário.",
      };
    }
    row = data as Record<string, unknown>;
  }

  const books = await loadBooks(gate.admin);
  const event = mapEvent(
    row as Parameters<typeof mapEvent>[0],
    books,
    null,
    "calendar",
  );

  if (
    shouldOpenMeetingRecord({
      kind: event.kind,
      orgId: parsed.orgId ?? event.orgId,
      calendarSlug: event.calendarSlug,
    })
  ) {
    const meetingId = await upsertMeetingFromCalendarEvent(gate.admin, {
      eventId: event.id,
      meetingId: event.meetingId,
      title: event.title,
      date: parsed.date,
      time: allDay ? null : (parsed.time ?? "09:00"),
      durationMin: parsed.durationMin,
      allDay,
      orgId: parsed.orgId ?? event.orgId,
      link: event.link,
      notes: event.notes,
      guests,
      createdBy: gate.userId,
    });
    if (meetingId) {
      event.meetingId = meetingId;
      event.orgId = parsed.orgId ?? event.orgId;
    }
  }

  await revalidateCalendarSurfaces(gate.admin, parsed.orgId ?? event.orgId);

  if (parsed.postToSala) {
    const { data: channel } = await gate.admin
      .from("staff_channels")
      .select("id")
      .eq("kind", "channel")
      .eq("slug", "geral")
      .maybeSingle();
    const channelId = parsed.channelId ?? (channel?.id as string | undefined);
    if (channelId) {
      await gate.admin.from("staff_messages").insert({
        channel_id: channelId,
        author_id: gate.userId,
        kind: "system",
        body: `Agenda: ${parsed.title} · ${parsed.date}${allDay ? "" : ` ${parsed.time ?? ""}`}`,
      });
    }
  }

  if (parsed.sendInvite && guests.length > 0) {
    const organizer = await organizerOf(gate.admin, gate.userId);
    if (organizer) {
      const sequence = Number(row.ics_sequence ?? 0) + 1;
      const mail = await sendCalendarEventMail({
        eventId: event.id,
        title: event.title,
        startsAt: start,
        endsAt: end,
        notes: event.notes,
        link: event.link,
        location: event.location,
        guests: guests.map((guest) => ({
          email: guest.email,
          nome: guest.name,
        })),
        organizer,
        sequence,
        method: "REQUEST",
      });
      await gate.admin
        .from("staff_calendar_events")
        .update({ ics_sequence: sequence })
        .eq("id", event.id);
      if (mail.failed > 0 && mail.error) {
        return {
          success: true,
          data: event,
        };
      }
    }
  }

  return { success: true, data: event };
}

export async function createCalendarEvent(
  input: unknown,
): Promise<Result<CalendarEvent>> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }
  const gate = await requireCalendarAccess(parsed.data.orgId, true);
  if (!gate.ok) return { success: false, error: gate.error };
  const data = gate.orgId ? { ...parsed.data, orgId: gate.orgId } : parsed.data;
  return persistEvent(gate, data, null);
}

export async function updateCalendarEvent(
  input: unknown,
): Promise<Result<CalendarEvent>> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) {
    return { success: false, error: "Horário inválido." };
  }
  const gate = await requireCalendarAccess(parsed.data.orgId, true);
  if (!gate.ok) return { success: false, error: gate.error };
  const data = gate.orgId ? { ...parsed.data, orgId: gate.orgId } : parsed.data;
  return persistEvent(gate, data, parsed.data.id);
}

export async function deleteCalendarEvent(id: string): Promise<Result<true>> {
  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Horário inválido." };
  }
  const peek = await createAdminClient();
  const { data: existing } = await peek
    .from("staff_calendar_events")
    .select(
      "id, title, starts_at, ends_at, notes, link, location, guests, ics_sequence, org_id",
    )
    .eq("id", id)
    .maybeSingle();
  const gate = await requireCalendarAccess(
    (existing?.org_id as string | undefined) ?? undefined,
    true,
  );
  if (!gate.ok) return { success: false, error: gate.error };
  if (existing) {
    const guests = parseGuests(existing.guests);
    if (guests.length > 0) {
      const organizer = await organizerOf(gate.admin, gate.userId);
      if (organizer) {
        await sendCalendarEventMail({
          eventId: id,
          title: existing.title as string,
          startsAt: new Date(existing.starts_at as string),
          endsAt: new Date(existing.ends_at as string),
          notes: (existing.notes as string | null) ?? null,
          link: (existing.link as string | null) ?? null,
          location: (existing.location as string | null) ?? null,
          guests: guests.map((guest) => ({
            email: guest.email,
            nome: guest.name,
          })),
          organizer,
          sequence: Number(existing.ics_sequence ?? 0) + 1,
          method: "CANCEL",
        });
      }
    }
  }
  const { error } = await gate.admin
    .from("staff_calendar_events")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  await revalidateCalendarSurfaces(
    gate.admin,
    (existing?.org_id as string | null | undefined) ?? null,
  );
  return { success: true, data: true };
}

export async function sendCalendarInviteNow(
  id: string,
  reminder = false,
): Promise<Result<{ sent: number }>> {
  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Horário inválido." };
  }
  const peek = await createAdminClient();
  const { data: peekRow } = await peek
    .from("staff_calendar_events")
    .select("org_id")
    .eq("id", id)
    .maybeSingle();
  const gate = await requireCalendarAccess(
    (peekRow?.org_id as string | undefined) ?? undefined,
    true,
  );
  if (!gate.ok) return { success: false, error: gate.error };
  const { data } = await gate.admin
    .from("staff_calendar_events")
    .select(EVENT_COLS)
    .eq("id", id)
    .maybeSingle();
  if (!data) return { success: false, error: "Horário não encontrado." };
  const guests = parseGuests(data.guests);
  if (guests.length === 0) {
    return { success: false, error: "Inclua ao menos um e-mail de convidado." };
  }
  const organizer = await organizerOf(gate.admin, gate.userId);
  if (!organizer) {
    return {
      success: false,
      error: "Sua conta não tem e-mail para enviar o convite.",
    };
  }
  const sequence = Number(data.ics_sequence ?? 0) + 1;
  const mail = await sendCalendarEventMail({
    eventId: id,
    title: data.title as string,
    startsAt: new Date(data.starts_at as string),
    endsAt: new Date(data.ends_at as string),
    notes: (data.notes as string | null) ?? null,
    link: (data.link as string | null) ?? null,
    location: (data.location as string | null) ?? null,
    guests: guests.map((guest) => ({ email: guest.email, nome: guest.name })),
    organizer,
    sequence,
    method: "REQUEST",
    reminder,
  });
  await gate.admin
    .from("staff_calendar_events")
    .update({
      ics_sequence: sequence,
      ...(reminder ? { remind_sent_at: new Date().toISOString() } : {}),
    })
    .eq("id", id);
  if (mail.sent === 0) {
    return {
      success: false,
      error: mail.error ?? "O convite não saiu. Confira a chave de e-mail.",
    };
  }
  return { success: true, data: { sent: mail.sent } };
}

export async function createCalendarBook(input: {
  name: string;
  color?: string;
}): Promise<Result<CalendarBook>> {
  const gate = await requireAgenda();
  if (!gate.ok) return { success: false, error: gate.error };
  const name = input.name.trim();
  if (name.length < 2) return { success: false, error: "Dê um nome à agenda." };
  const color =
    CALENDAR_COLORS.find((item) => item === input.color) ?? CALENDAR_COLORS[0];
  let slug = slugifyLabel(name);
  const { data: clash } = await gate.admin
    .from("staff_calendar_calendars")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const { data, error } = await gate.admin
    .from("staff_calendar_calendars")
    .insert({
      name,
      color,
      slug,
      is_system: false,
      source_key: "custom",
      sort: 200,
      created_by: gate.userId,
    })
    .select("id, name, color, slug, is_system, source_key")
    .single();
  if (error || !data) {
    return { success: false, error: error?.message ?? "Não criei a agenda." };
  }
  return {
    success: true,
    data: mapBook(data as Parameters<typeof mapBook>[0]),
  };
}

export async function deleteCalendarBook(id: string): Promise<Result<true>> {
  const gate = await requireAgenda();
  if (!gate.ok) return { success: false, error: gate.error };
  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Agenda inválida." };
  }
  const { data } = await gate.admin
    .from("staff_calendar_calendars")
    .select("is_system")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { success: false, error: "Agenda não encontrada." };
  if (data.is_system) {
    return {
      success: false,
      error: "Essa agenda é do sistema e não pode ser apagada.",
    };
  }
  const { error } = await gate.admin
    .from("staff_calendar_calendars")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: true };
}

export async function createCalendarType(
  name: string,
): Promise<Result<CalendarType>> {
  const gate = await requireAgenda();
  if (!gate.ok) return { success: false, error: gate.error };
  const label = name.trim();
  if (label.length < 2) return { success: false, error: "Dê um nome ao tipo." };
  let slug = slugifyLabel(label);
  const { data: clash } = await gate.admin
    .from("staff_calendar_types")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const { data, error } = await gate.admin
    .from("staff_calendar_types")
    .insert({
      name: label,
      slug,
      is_system: false,
      created_by: gate.userId,
    })
    .select("id, name, slug, is_system")
    .single();
  if (error || !data) {
    return { success: false, error: error?.message ?? "Não criei o tipo." };
  }
  return {
    success: true,
    data: {
      id: data.id as string,
      name: data.name as string,
      slug: data.slug as string,
      isSystem: false,
    },
  };
}
