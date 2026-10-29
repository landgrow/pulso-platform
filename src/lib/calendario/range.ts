import {
  addDaysIso,
  civilDateInSaoPaulo,
  hourInSaoPaulo,
  minuteInSaoPaulo,
  saoPauloDateTime,
  weekdayInSaoPaulo,
} from "@/lib/notify/calendar";

const WEEKDAY_SHORT = [
  "dom",
  "seg",
  "ter",
  "qua",
  "qui",
  "sex",
  "sáb",
] as const;

export function weekdayOfIso(isoDate: string): number {
  return weekdayInSaoPaulo(saoPauloDateTime(isoDate, "12:00:00"));
}

/** Semana começando no domingo, como na agenda de referência. */
export function startOfWeekSunday(isoDate: string): string {
  return addDaysIso(isoDate, -weekdayOfIso(isoDate));
}

export function startOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function addMonthsIso(isoDate: string, months: number): string {
  const year = Number(isoDate.slice(0, 4));
  const monthIndex = Number(isoDate.slice(5, 7)) - 1 + months;
  const day = Number(isoDate.slice(8, 10));
  const utc = Date.UTC(year, monthIndex, day);
  return new Date(utc).toISOString().slice(0, 10);
}

export function monthGridStart(isoDate: string): string {
  return startOfWeekSunday(startOfMonth(isoDate));
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysIso(weekStart, index));
}

export function monthCells(isoDate: string): string[] {
  const start = monthGridStart(isoDate);
  return Array.from({ length: 42 }, (_, index) => addDaysIso(start, index));
}

export function monthTitle(isoDate: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(saoPauloDateTime(isoDate, "12:00:00"));
}

export function weekdayShort(isoDate: string): string {
  return WEEKDAY_SHORT[weekdayOfIso(isoDate)] ?? "dia";
}

export function dayNumber(isoDate: string): string {
  return String(Number(isoDate.slice(8, 10)));
}

export function minutesFromMidnight(iso: string): number {
  const instant = new Date(iso);
  return hourInSaoPaulo(instant) * 60 + minuteInSaoPaulo(instant);
}

export function padClock(hour: number, minute = 0): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function hourLabel(hour: number): string {
  return `${hour}h`;
}

export { civilDateInSaoPaulo, addDaysIso };
