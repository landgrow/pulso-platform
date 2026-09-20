"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, CHART_AXIS, formatAxisMoney } from "@/lib/charts/theme";
import { monthLabel } from "@/lib/financeiro/ledger";
import type { MonthBalance } from "@/types/financeiro";
import { ChartEmpty, ChartFrame } from "./chart-frame";
import { ChartTooltip } from "./chart-tooltip";

export function MonthSplitChart({
  month,
  balance,
}: {
  month: string;
  balance: MonthBalance | null;
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

  return (
    <ChartFrame
      eyebrow="Mês"
      title={`Composição · ${monthLabel(month)}`}
      hint="Entrou − imposto da nota − saiu = balanço."
    >
      {hasData ? (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                stroke={CHART.grid}
                strokeDasharray="3 6"
                vertical={false}
              />
              <XAxis dataKey="name" {...CHART_AXIS} />
              <YAxis
                {...CHART_AXIS}
                tickFormatter={formatAxisMoney}
                width={52}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)", opacity: 0.55 }}
                content={<ChartTooltip />}
              />
              <Bar
                dataKey="value"
                name="Valor"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              >
                {rows.map((row) => (
                  <Cell key={row.name} fill={row.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty>Sem lançamentos neste mês.</ChartEmpty>
      )}
    </ChartFrame>
  );
}
