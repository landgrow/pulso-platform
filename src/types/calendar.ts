import type { CalendarGuest } from "@/lib/calendario/model";

export type CalendarEventSource = "calendar" | "meeting" | "holiday";

export interface CalendarBook {
  id: string;
  name: string;
  color: string;
  slug: string;
  isSystem: boolean;
  sourceKey: string | null;
}

export interface CalendarType {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
}

export interface CalendarStaff {
  userId: string;
  name: string;
  email: string;
}

export interface CalendarClient {
  id: string;
  name: string;
  slug: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  kind: string;
  calendarId: string | null;
  calendarSlug: string | null;
  color: string;
  orgId: string | null;
  orgName: string | null;
  meetingId: string | null;
  channelId: string | null;
  link: string | null;
  notes: string | null;
  location: string | null;
  guests: CalendarGuest[];
  remindMinutes: number | null;
  source: CalendarEventSource;
  allDay: boolean;
  editable: boolean;
}

export interface CalendarAgenda {
  today: string;
  greetingName: string;
  events: CalendarEvent[];
  calendars: CalendarBook[];
  types: CalendarType[];
  staff: CalendarStaff[];
  clients: CalendarClient[];
}

export type { CalendarGuest };
