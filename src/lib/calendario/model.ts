export const CALENDAR_COLORS = [
  "#4f46e5",
  "#26304d",
  "#0f766e",
  "#b45309",
  "#be123c",
  "#0369a1",
  "#3f6212",
  "#475569",
] as const;

export function slugifyLabel(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug.length >= 2 ? slug : `item-${Date.now().toString(36)}`;
}

export interface CalendarGuest {
  email: string;
  name: string;
  userId?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseGuests(value: unknown): CalendarGuest[] {
  if (!Array.isArray(value)) return [];
  const out: CalendarGuest[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const email =
      typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
    if (!EMAIL.test(email) || seen.has(email)) continue;
    seen.add(email);
    const name =
      typeof record.name === "string" && record.name.trim()
        ? record.name.trim()
        : (email.split("@")[0] ?? email);
    const guest: CalendarGuest = { email, name };
    if (typeof record.userId === "string" && record.userId.length > 0) {
      guest.userId = record.userId;
    }
    out.push(guest);
  }
  return out;
}

export function guestFromEmail(
  raw: string,
  userId?: string,
): CalendarGuest | null {
  const email = raw.trim().toLowerCase();
  if (!EMAIL.test(email)) return null;
  const guest: CalendarGuest = {
    email,
    name: email.split("@")[0] ?? email,
  };
  if (userId) guest.userId = userId;
  return guest;
}
