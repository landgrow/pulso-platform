"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { originColor } from "@/lib/charts/theme";
import { monthLabel } from "@/lib/financeiro/ledger";
import { formatCurrency } from "@/lib/utils";
import {
  ENTRY_ORIGIN_LABELS,
  INCOME_ORIGINS,
  type FinanceEntryOrigin,
} from "@/types/financeiro";
import { ChartEmpty, ChartFrame } from "./chart-frame";
import { ChartTooltip, CountTooltip } from "./chart-tooltip";

export function OriginMixChart({
  month,
  values,
}: {
  month: string;
  values: Partial<Record<FinanceEntryOrigin, number>>;
}): JSX.Element {
  const rows = INCOME_ORIGINS.map((origin) => ({
    name: ENTRY_ORIGIN_LABELS[origin],
    origin,
    value: values[origin] ?? 0,
    color: originColor(origin),
  })).filter((row) => row.value > 0);
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <ChartFrame
      eyebrow="Origem"
      title={`De onde entrou · ${monthLabel(month)}`}
      hint="Fee, projeto, edital e outros do mês aberto."
    >
      {total === 0 ? (
        <ChartEmpty>Nenhuma entrada neste mês.</ChartEmpty>
      ) : (
        <div className="grid items-center gap-6 sm:grid-cols-[180px_1fr]">
          <div className="relative mx-auto h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={80}
                  stroke="var(--surface-1)"
                  strokeWidth={3}
                  paddingAngle={2}
                >
                  {rows.map((row) => (
                    <Cell key={row.origin} fill={row.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] uppercase tracking-[0.12em] text-text-3">
                total
              </span>
              <span className="text-sm font-semibold tabular-nums text-text-1">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
          <ul className="space-y-2.5">
            {rows.map((row) => (
              <li
                key={row.origin}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex items-center gap-2 text-text-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: row.color }}
                  />
                  {row.name}
                </span>
                <span className="tabular-nums text-text-1">
                  {formatCurrency(row.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartFrame>
  );
}

export function StatusDonut({
  title,
  hint,
  center,
  centerLabel,
  rows,
}: {
  title: string;
  hint?: string;
  center: string;
  centerLabel: string;
  rows: Array<{ name: string; value: number; color: string }>;
}): JSX.Element {
  const visible = rows.filter((row) => row.value > 0);
  return (
    <ChartFrame title={title} hint={hint}>
      {visible.length === 0 ? (
        <ChartEmpty>Sem distribuição ainda.</ChartEmpty>
      ) : (
        <div className="grid items-center gap-6 sm:grid-cols-[180px_1fr]">
          <div className="relative mx-auto h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={visible}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={72}
                  stroke="var(--surface-1)"
                  strokeWidth={3}
                  paddingAngle={2}
                >
                  {visible.map((row) => (
                    <Cell key={row.name} fill={row.color} />
                  ))}
                </Pie>
                <Tooltip content={<CountTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold tabular-nums text-text-1">
                {center}
              </span>
              <span className="text-[11px] text-text-3">{centerLabel}</span>
            </div>
          </div>
          <ul className="space-y-2">
            {visible.map((row) => (
              <li
                key={row.name}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex items-center gap-2 text-text-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: row.color }}
                  />
                  {row.name}
                </span>
                <span className="tabular-nums text-text-1">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartFrame>
  );
}
