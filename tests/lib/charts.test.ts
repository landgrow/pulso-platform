import { describe, expect, it } from "vitest";
import { formatAxisMoney, originColor } from "@/lib/charts/theme";

describe("chart design tokens", () => {
  it("compacts money on the axis without inventing a currency symbol", () => {
    expect(formatAxisMoney(0)).toBe("0");
    expect(formatAxisMoney(850)).toBe("850");
    expect(formatAxisMoney(18000)).toBe("18 mil");
    expect(formatAxisMoney(-2000)).toBe("−2 mil");
    expect(formatAxisMoney(1_200_000)).toBe("1,2 mi");
  });

  it("maps income origins to the chart palette", () => {
    expect(originColor("fee_mensal")).toBe("var(--chart-fee)");
    expect(originColor("projeto")).toBe("var(--chart-projeto)");
    expect(originColor("edital")).toBe("var(--chart-edital)");
  });
});
