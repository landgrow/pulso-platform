import { describe, expect, it } from "vitest";
import { brazilHolidays, easterSunday } from "@/lib/calendario/holidays-br";
import { parseGuests, slugifyLabel } from "@/lib/calendario/model";
import {
  monthCells,
  startOfMonth,
  startOfWeekSunday,
  weekdayOfIso,
  weekDays,
} from "@/lib/calendario/range";

describe("calendário", () => {
  it("starts the week on Sunday in Brasília", () => {
    expect(weekdayOfIso("2026-10-23")).toBe(5);
    expect(startOfWeekSunday("2026-10-23")).toBe("2026-10-18");
    expect(weekDays("2026-10-18")).toEqual([
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
    ]);
  });

  it("builds a 6-week month grid", () => {
    expect(startOfMonth("2026-10-23")).toBe("2026-10-01");
    expect(monthCells("2026-10-23")).toHaveLength(42);
    expect(monthCells("2026-10-23")[0]).toBe("2026-09-27");
  });

  it("slugifies custom agenda names", () => {
    expect(slugifyLabel("Call comercial")).toBe("call-comercial");
  });

  it("keeps guest emails and drops invalids", () => {
    const guests = parseGuests([
      { email: "Ana@Landgrow.com.br", name: "Ana" },
      { email: "nao-e-email" },
      { email: "ana@landgrow.com.br" },
    ]);
    expect(guests).toEqual([{ email: "ana@landgrow.com.br", name: "Ana" }]);
  });

  it("lists Brazilian holidays including movable dates", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    const titles = brazilHolidays(2026).map((row) => `${row.date} ${row.title}`);
    expect(titles).toContain("2026-02-17 Carnaval");
    expect(titles).toContain("2026-04-03 Sexta-feira Santa");
    expect(titles).toContain("2026-09-07 Independência do Brasil");
    expect(titles).toContain("2026-11-20 Consciência Negra");
  });
});
