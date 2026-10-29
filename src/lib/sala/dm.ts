/** Par estável para DM — UUID usa hífen, então o underscore separa os dois ids. */
export function dmSlug(a: string, b: string): string {
  return a < b ? `dm:${a}_${b}` : `dm:${b}_${a}`;
}

export function otherDmUserId(
  slug: string | null,
  meId: string,
): string | null {
  if (!slug?.startsWith("dm:")) return null;
  const parts = slug.slice(3).split("_");
  if (parts.length !== 2) return null;
  if (parts[0] === meId) return parts[1] ?? null;
  if (parts[1] === meId) return parts[0] ?? null;
  return null;
}

export function staffDisplayName(
  name: string | null | undefined,
  fallback = "Colega",
): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "LG";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function formatSalaTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return new Intl.DateTimeFormat(
    "pt-BR",
    sameDay
      ? { hour: "2-digit", minute: "2-digit" }
      : {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        },
  ).format(date);
}

export function isPulsoPrompt(text: string): boolean {
  return /^@?pulso\b/i.test(text.trim()) || /^\/pulso\b/i.test(text.trim());
}

export function previewBody(body: string, max = 72): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}…`;
}
