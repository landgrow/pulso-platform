"use client";

import { CHART } from "@/lib/charts/theme";
import { monthLabel } from "@/lib/financeiro/ledger";
import { formatCurrency } from "@/lib/utils";
import type { MonthBalance } from "@/types/financeiro";
import { ChartEmpty, ChartFrame } from "./chart-frame";

export function MonthSplitChart({
  month,
  balance,
  periodLabel,
}: {
  month: string;
  balance: MonthBalance | null;
  periodLabel?: string | undefined;
}): JSX.Element {
  const rows = balance
    ? [
        { name: "Entrou", value: balance.entradas, color: CHART.in },
        { name: "Imposto", value: balance.impostosNotas, color: CHART.tax },
        { name: "Saiu", value: balance.saidas, color: CHART.out },
        { name: "Balanço", value: balance.balanco, color: CHART.net },
      ]
    : [];
  const hasData = rows.some((row) => row.value !== 0);
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.value)));

  return (
    <ChartFrame
      eyebrow="Recorte"
      title={`Composição · ${periodLabel ?? monthLabel(month)}`}
      hint="Entrou − imposto da nota − saiu = balanço."
    >
      {hasData ? (
        <ul className="space-y-4 pt-1">
          {rows.map((row) => (
            <li key={row.name} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-text-2">{row.name}</span>
                <span className="text-sm font-medium tabular-nums text-text-1">
                  {formatCurrency(row.value)}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(Math.abs(row.value) / max) * 100}%`,
                    background: row.color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ChartEmpty>Sem lançamentos neste mês.</ChartEmpty>
      )}
    </ChartFrame>
  );
}
