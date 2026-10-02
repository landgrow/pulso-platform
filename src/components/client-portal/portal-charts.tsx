"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartEmpty,
  ChartFrame,
  ChartLegend,
} from "@/components/charts/chart-frame";

export interface ChartDatum {
  label: string;
  value: number;
}

const SERIES = [
  "var(--text-3)",
  "var(--primary)",
  "var(--success)",
  "var(--error)",
  "var(--warning)",
];

function TooltipBox({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; payload?: { label?: string } }[];
  unit?: string;
}): JSX.Element | null {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-surface-1 px-3 py-2 text-xs">
      <span className="text-text-2">
        {item?.payload?.label ?? item?.name}:{" "}
      </span>
      <span className="font-semibold tabular-nums text-text-1">
        {item?.value}
        {unit ?? ""}
      </span>
    </div>
  );
}

export function StatusDonut({
  title,
  hint,
  data,
  colors = SERIES,
}: {
  title: string;
  hint?: string;
  data: ChartDatum[];
  colors?: string[];
}): JSX.Element {
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <ChartFrame title={title} hint={hint}>
      {total === 0 ? (
        <ChartEmpty>Nenhuma tarefa no recorte.</ChartEmpty>
      ) : (
        <div className="space-y-3">
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="68%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((d, i) => (
                    <Cell
                      key={d.label}
                      fill={colors[i % colors.length] ?? "var(--primary)"}
                    />
                  ))}
                </Pie>
                <Tooltip content={<TooltipBox />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums text-text-1">
                {total}
              </span>
              <span className="text-[11px] text-text-3">tarefas</span>
            </div>
          </div>
          <ChartLegend
            items={data.map((d, i) => ({
              label: `${d.label} (${d.value})`,
              color: colors[i % colors.length] ?? "var(--primary)",
            }))}
          />
        </div>
      )}
    </ChartFrame>
  );
}

export function SimpleBars({
  title,
  hint,
  data,
  colors = SERIES,
  unit,
  max,
  emptyText = "Nada para mostrar no recorte.",
}: {
  title: string;
  hint?: string;
  data: ChartDatum[];
  colors?: string[];
  unit?: string;
  max?: number;
  emptyText?: string;
}): JSX.Element {
  const hasData = data.some((d) => d.value > 0);
  return (
    <ChartFrame title={title} hint={hint}>
      {!hasData ? (
        <ChartEmpty>{emptyText}</ChartEmpty>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--chart-grid)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--chart-tick)", fontSize: 11 }}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--chart-tick)", fontSize: 11 }}
                {...(max !== undefined ? { domain: [0, max] } : {})}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                content={<TooltipBox {...(unit ? { unit } : {})} />}
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
                isAnimationActive={false}
              >
                {data.map((d, i) => (
                  <Cell
                    key={d.label}
                    fill={colors[i % colors.length] ?? "var(--primary)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFrame>
  );
}
