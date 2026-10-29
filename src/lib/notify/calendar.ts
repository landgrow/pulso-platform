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

const WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** 0 = domingo … 6 = sábado, relógio de São Paulo. */
export function weekdayInSaoPaulo(now: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    weekday: "short",
  }).format(now);
  return WEEKDAY_SHORT[weekday] ?? 0;
}

export function minuteInSaoPaulo(now: Date = new Date()): number {
  const minute = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    minute: "2-digit",
  }).format(now);
  return Number.parseInt(minute, 10);
}

/** Interpreta data + hora civil de Brasília (sem horário de verão). */
export function saoPauloDateTime(isoDate: string, time?: string | null): Date {
  const clock = (time && time.length >= 5 ? time : "09:00:00").slice(0, 8);
  const padded = clock.length === 5 ? `${clock}:00` : clock;
  return new Date(`${isoDate}T${padded}-03:00`);
}

/** Data civil em São Paulo de um instante ISO (evita agrupar agenda pelo UTC). */
export function civilDateInSaoPaulo(instant: string | Date): string {
  return dateInSaoPaulo(
    typeof instant === "string" ? new Date(instant) : instant,
  );
}
