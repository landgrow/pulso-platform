import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { dateInSaoPaulo } from "@/lib/notify/calendar";
import { parseGuests } from "@/lib/calendario/model";
import { sendCalendarEventMail } from "@/lib/calendario/send-event-mail";
import { staffDisplayName } from "@/lib/sala/dm";

export async function sendCalendarEventReminders(
  now: Date = new Date(),
): Promise<{ checked: number; sent: number }> {
  const admin = await createAdminClient();
  const today = dateInSaoPaulo(now);
  const { data, error } = await admin
    .from("staff_calendar_events")
    .select(
      "id, title, starts_at, ends_at, notes, link, location, guests, ics_sequence, created_by, remind_minutes",
    )
    .not("remind_minutes", "is", null)
    .is("remind_sent_at", null)
    .gte("starts_at", `${today}T00:00:00-03:00`)
    .lte("starts_at", `${today}T23:59:59-03:00`);
  if (error) return { checked: 0, sent: 0 };

  let checked = 0;
  let sent = 0;
  for (const row of data ?? []) {
    const guests = parseGuests(row.guests);
    if (guests.length === 0) continue;
    checked += 1;
    const { data: claimed } = await admin
      .from("staff_calendar_events")
      .update({ remind_sent_at: now.toISOString() })
      .eq("id", row.id)
      .is("remind_sent_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    let organizer = { email: "", nome: "PULSO" };
    if (row.created_by) {
      const [{ data: profile }, { data: auth }] = await Promise.all([
        admin
          .from("profiles")
          .select("full_name")
          .eq("id", row.created_by)
          .maybeSingle(),
        admin.auth.admin.getUserById(row.created_by as string),
      ]);
      const email = auth.user?.email?.trim() ?? "";
      if (email) {
        organizer = {
          email,
          nome: staffDisplayName(
            profile?.full_name as string | null,
            email.split("@")[0] ?? "PULSO",
          ),
        };
      }
    }
    if (!organizer.email) {
      await admin
        .from("staff_calendar_events")
        .update({ remind_sent_at: null })
        .eq("id", row.id);
      continue;
    }
    const mail = await sendCalendarEventMail({
      eventId: row.id as string,
      title: row.title as string,
      startsAt: new Date(row.starts_at as string),
      endsAt: new Date(row.ends_at as string),
      notes: (row.notes as string | null) ?? null,
      link: (row.link as string | null) ?? null,
      location: (row.location as string | null) ?? null,
      guests: guests.map((guest) => ({ email: guest.email, nome: guest.name })),
      organizer,
      sequence: Number(row.ics_sequence ?? 0),
      method: "REQUEST",
      reminder: true,
    });
    sent += mail.sent;
    if (mail.sent === 0) {
      await admin
        .from("staff_calendar_events")
        .update({ remind_sent_at: null })
        .eq("id", row.id);
    }
  }
  return { checked, sent };
}
