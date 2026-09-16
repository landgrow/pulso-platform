const ZONE = "America/Sao_Paulo";

/** Data civil em São Paulo no formato YYYY-MM-DD. */
export function dateInSaoPaulo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function hourInSaoPaulo(now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    hour: "2-digit",
    hour12: false,
  }).format(now);
  return Number.parseInt(hour, 10);
}

export function addDaysIso(isoDate: string, days: number): string {
  const parts = isoDate.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const utc = Date.UTC(year, month - 1, day + days);
  return new Date(utc).toISOString().slice(0, 10);
}

export function isDigestHour(now: Date = new Date()): boolean {
  return hourInSaoPaulo(now) === 8;
}
