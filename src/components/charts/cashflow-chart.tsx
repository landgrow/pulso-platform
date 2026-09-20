"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, CHART_AXIS, formatAxisMoney } from "@/lib/charts/theme";
import { monthLabel } from "@/lib/financeiro/ledger";
import type { FinanceCashMonth } from "@/types/financeiro";
import { ChartEmpty, ChartFrame, ChartLegend } from "./chart-frame";
import { ChartTooltip } from "./chart-tooltip";

export function CashflowChart({
  data,
  title = "Fluxo de 6 meses",
}: {
  data: FinanceCashMonth[];
  title?: string;
}): JSX.Element {
  const rows = data.map((row) => ({
    ...row,
    label: shortMonth(row.month, row.label),
    entradas: row.inflows,
    saidas: row.outflows,
    balanco: row.net,
  }));
  const hasData = rows.some((row) => row.entradas > 0 || row.saidas > 0);

  return (
    <ChartFrame
      eyebrow="Financeiro"
      title={title}
      hint="O mesmo livro do mês: competência, não caixa de banco."
      action={
        <ChartLegend
          items={[
            { label: "Entrou", color: CHART.in },
            { label: "Saiu", color: CHART.out },
            { label: "Balanço", color: CHART.net },
          ]}
        />
      }
    >
      {hasData ? (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={rows}
              barGap={4}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                stroke={CHART.grid}
                strokeDasharray="3 6"
                vertical={false}
              />
              <XAxis dataKey="label" {...CHART_AXIS} />
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
                dataKey="entradas"
                name="Entrou"
                fill={CHART.in}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="saidas"
                name="Saiu"
                fill={CHART.out}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Line
                type="monotone"
                dataKey="balanco"
                name="Balanço"
                stroke={CHART.net}
                strokeWidth={2.25}
                dot={{ r: 3, fill: CHART.net, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty>
          Sem movimento nos últimos 6 meses. O que entrar no livro aparece aqui.
        </ChartEmpty>
      )}
    </ChartFrame>
  );
}

function shortMonth(month: string, fallback: string): string {
  const [year, mm] = month.split("-");
  if (!year || !mm) return fallback;
  return monthLabel(month).replace(` ${year}`, "");
}
