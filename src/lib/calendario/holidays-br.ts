import { addDaysIso } from "@/lib/notify/calendar";

export interface BrazilHoliday {
  date: string;
  title: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Domingo de Páscoa no calendário gregoriano. */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function brazilHolidays(year: number): BrazilHoliday[] {
  const easter = easterSunday(year);
  const fixed: BrazilHoliday[] = [
    { date: `${year}-01-01`, title: "Confraternização Universal" },
    { date: `${year}-04-21`, title: "Tiradentes" },
    { date: `${year}-05-01`, title: "Dia do Trabalho" },
    { date: `${year}-09-07`, title: "Independência do Brasil" },
    { date: `${year}-10-12`, title: "Nossa Senhora Aparecida" },
    { date: `${year}-11-02`, title: "Finados" },
    { date: `${year}-11-15`, title: "Proclamação da República" },
    { date: `${year}-11-20`, title: "Consciência Negra" },
    { date: `${year}-12-25`, title: "Natal" },
  ];
  const movable: BrazilHoliday[] = [
    { date: addDaysIso(easter, -47), title: "Carnaval" },
    { date: addDaysIso(easter, -2), title: "Sexta-feira Santa" },
    { date: addDaysIso(easter, 60), title: "Corpus Christi" },
  ];
  return [...fixed, ...movable].sort((a, b) => a.date.localeCompare(b.date));
}

export function holidaysBetween(from: string, to: string): BrazilHoliday[] {
  const years = new Set([Number(from.slice(0, 4)), Number(to.slice(0, 4))]);
  return [...years]
    .flatMap((year) => brazilHolidays(year))
    .filter((row) => row.date >= from && row.date <= to);
}
