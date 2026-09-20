import type { FinanceEntryOrigin } from "@/types/financeiro";

/** Tokens de série — os valores vêm de globals.css (--chart-*). */
export const CHART = {
  in: "var(--chart-in)",
  out: "var(--chart-out)",
  net: "var(--chart-net)",
  tax: "var(--chart-tax)",
  grid: "var(--chart-grid)",
  tick: "var(--chart-tick)",
  surface: "var(--surface-1)",
  border: "var(--border)",
  text: "var(--text-1)",
  muted: "var(--text-2)",
  origins: {
    fee_mensal: "var(--chart-fee)",
    projeto: "var(--chart-projeto)",
    edital: "var(--chart-edital)",
    outros: "var(--chart-outros)",
    despesa: "var(--chart-out)",
  } satisfies Record<FinanceEntryOrigin, string>,
  status: {
    andamento: "var(--primary)",
    atrasados: "var(--danger)",
    concluidos: "var(--success)",
  },
} as const;

export const CHART_AXIS = {
  tick: { fill: CHART.tick, fontSize: 11 },
  axisLine: false as const,
  tickLine: false as const,
};

export function formatAxisMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  }
  if (abs >= 1000) {
    return `${sign}${Math.round(abs / 1000)} mil`;
  }
  return `${sign}${Math.round(abs)}`;
}

export function originColor(origin: FinanceEntryOrigin): string {
  return CHART.origins[origin];
}
