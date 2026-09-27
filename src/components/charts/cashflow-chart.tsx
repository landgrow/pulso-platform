"use client";

import { useId } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, formatAxisMoney } from "@/lib/charts/theme";
import { monthLabel } from "@/lib/financeiro/ledger";
import { cn, formatCurrency } from "@/lib/utils";
import type { FinanceCashMonth, MonthBalance } from "@/types/financeiro";
import { ChartEmpty, ChartFrame } from "./chart-frame";

type CashflowRow = FinanceCashMonth & {
  label: string;
  entradas: number;
  saidas: number;
  balanco: number;
};

export function CashflowChart({
  data,
  title = "Balanço do recorte",
  hint = "Competência no recorte aberto, não caixa de banco.",
  summary = null,
}: {
  data: FinanceCashMonth[];
  title?: string;
  hint?: string;
  summary?: MonthBalance | null;
}): JSX.Element {
  const uid = useId().replace(/:/g, "");
  const areaId = `cash-area-${uid}`;
  const glowId = `cash-glow-${uid}`;
  const rows: CashflowRow[] = data.map((row) => ({
    ...row,
    label: shortMonth(row.month, row.label),
    entradas: row.inflows,
    saidas: row.outflows,
    balanco: row.net,
  }));
  const hasData = rows.some((row) => row.entradas > 0 || row.saidas > 0);
  const last =
    [...rows].reverse().find((row) => row.entradas > 0 || row.saidas > 0) ??
    rows[rows.length - 1];
  const prevIndex = last
    ? rows.findIndex((row) => row.month === last.month) - 1
    : -1;
  const prev = prevIndex >= 0 ? rows[prevIndex] : undefined;
  const high = rows.reduce(
    (max, row) => Math.max(max, row.balanco),
    Number.NEGATIVE_INFINITY,
  );
  const low = rows.reduce(
    (min, row) => Math.min(min, row.balanco),
    Number.POSITIVE_INFINITY,
  );
  const delta = last && prev ? last.balanco - prev.balanco : null;
  const deltaPct =
    last && prev && prev.balanco !== 0
      ? (delta! / Math.abs(prev.balanco)) * 100
      : null;

  const hero = summary?.balanco ?? last?.balanco ?? 0;
  const inflows = summary?.entradas ?? last?.entradas ?? 0;
  const outflows = summary?.saidas ?? last?.saidas ?? 0;

  return (
    <ChartFrame eyebrow="Financeiro" hint={hint}>
      {hasData && last ? (
        <>
          <div className="mb-5">
            <h2 className="text-sm font-medium text-text-2">{title}</h2>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[2rem] font-semibold tabular-nums tracking-tight text-text-1">
                {formatCurrency(hero)}
              </span>
              {summary == null && delta != null ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-sm font-medium",
                    delta >= 0 ? "text-positive" : "text-negative",
                  )}
                >
                  {delta >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {deltaPct != null
                    ? formatPct(deltaPct)
                    : formatCurrency(delta)}
                  {prev ? (
                    <span className="font-normal text-text-3">
                      vs {prev.label}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <Stat label="Entrou" value={formatCurrency(inflows)} />
              <Stat label="Saiu" value={formatCurrency(outflows)} tone="out" />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-text-3">
              <span>
                Alta:{" "}
                <span className="font-medium text-text-1 tabular-nums">
                  {formatCurrency(high)}
                </span>
              </span>
              <span>
                Baixa:{" "}
                <span className="font-medium text-text-1 tabular-nums">
                  {formatCurrency(low)}
                </span>
              </span>
            </div>
          </div>

          <div
            className="h-[320px] w-full"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--border) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={rows}
                margin={{ top: 16, right: 12, left: 8, bottom: 8 }}
              >
                <defs>
                  <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={CHART.net}
                      stopOpacity={0.16}
                    />
                    <stop offset="100%" stopColor={CHART.net} stopOpacity={0} />
                  </linearGradient>
                  <filter
                    id={glowId}
                    x="-40%"
                    y="-40%"
                    width="180%"
                    height="180%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="8"
                      stdDeviation="14"
                      floodColor={CHART.net}
                      floodOpacity={0.45}
                    />
                  </filter>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 8"
                  stroke={CHART.grid}
                  strokeOpacity={1}
                  vertical={false}
                />
                <ReferenceLine
                  x={last.label}
                  stroke={CHART.net}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: CHART.net }}
                  tickMargin={12}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: CHART.net }}
                  tickFormatter={formatAxisMoney}
                  tickMargin={8}
                  width={72}
                  tickCount={4}
                />
                <Tooltip
                  cursor={{
                    stroke: "var(--text-3)",
                    strokeDasharray: "3 3",
                    strokeOpacity: 0.55,
                  }}
                  content={<BalanceTooltip />}
                />
                <Area
                  type="monotone"
                  dataKey="balanco"
                  stroke="none"
                  fill={`url(#${areaId})`}
                  tooltipType="none"
                  legendType="none"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="balanco"
                  name="Balanço"
                  stroke={CHART.net}
                  strokeWidth={2}
                  filter={`url(#${glowId})`}
                  dot={(props) => (
                    <BalanceDot
                      key={String(props.payload?.month ?? props.index)}
                      cx={props.cx}
                      cy={props.cy}
                      payload={props.payload as CashflowRow | undefined}
                      lastLabel={last.label}
                      high={high}
                      low={low}
                    />
                  )}
                  activeDot={{
                    r: 6,
                    fill: CHART.net,
                    stroke: "var(--surface-1)",
                    strokeWidth: 2,
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <ChartEmpty>
          Sem movimento neste recorte. O que entrar no livro aparece aqui.
        </ChartEmpty>
      )}
    </ChartFrame>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "out";
}): JSX.Element {
  return (
    <span className="text-text-2">
      {label}:{" "}
      <span
        className={cn(
          "font-semibold tabular-nums",
          tone === "out" ? "text-negative" : "text-text-1",
        )}
      >
        {value}
      </span>
    </span>
  );
}

function BalanceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: CashflowRow }>;
}): JSX.Element | null {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  return (
    <div className="min-w-[11rem] rounded-lg border border-border bg-surface-1 p-3 shadow-[0_16px_40px_rgba(10,15,30,0.18)]">
      <p className="mb-1 text-sm text-text-2">{row.label}</p>
      <p className="text-base font-semibold tabular-nums text-text-1">
        {formatCurrency(row.balanco)}
      </p>
      <p className="mt-1.5 text-[11px] text-text-3">
        Entrou {formatCurrency(row.entradas)} · Saiu{" "}
        {formatCurrency(row.saidas)}
      </p>
    </div>
  );
}

function BalanceDot({
  cx,
  cy,
  payload,
  lastLabel,
  high,
  low,
}: {
  cx?: number | undefined;
  cy?: number | undefined;
  payload?: CashflowRow | undefined;
  lastLabel: string;
  high: number;
  low: number;
}): JSX.Element {
  if (cx == null || cy == null || !payload) return <g />;
  const notable =
    payload.label === lastLabel ||
    payload.balanco === high ||
    payload.balanco === low;
  if (!notable) return <g />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={CHART.net}
      stroke="var(--surface-1)"
      strokeWidth={2}
    />
  );
}

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(".", ",")}%`;
}

function shortMonth(month: string, fallback: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(month)) {
    const [, mm, dd] = month.split("-");
    return dd && mm ? `${dd}/${mm}` : fallback;
  }
  const [year, mm] = month.split("-");
  if (!year || !mm) return fallback;
  return monthLabel(month).replace(` ${year}`, "");
}
