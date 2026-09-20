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
import { CountTooltip, StatusDonut } from "@/components/charts";
import { CHART, CHART_AXIS } from "@/lib/charts/theme";
import { isOverdue } from "@/lib/utils";
import type { Board } from "@/types/boards";

export function BoardPanelView({ board }: { board: Board }): JSX.Element {
  const total = board.cards.length;
  const done = board.columns.find((c) => /conclu[ií]d/i.test(c.label));
  const concluidas = done
    ? board.cards.filter((c) => c.column_id === done.id).length
    : 0;
  const atrasadas = board.cards.filter(
    (c) => c.column_id !== done?.id && isOverdue(c.prazo),
  ).length;
  const emAndamento = total - concluidas - atrasadas;

  const byColumn = board.columns.map((col) => ({
    name: col.label,
    value: board.cards.filter((c) => c.column_id === col.id).length,
    color: col.color || CHART.status.andamento,
  }));

  const overdueData = [
    {
      name: "Em dia",
      value: Math.max(0, total - atrasadas - concluidas),
      color: CHART.status.andamento,
    },
    { name: "Atrasadas", value: atrasadas, color: CHART.status.atrasados },
    { name: "Concluídas", value: concluidas, color: CHART.status.concluidos },
  ];

  const stats = [
    { label: "Todas as tarefas", value: total, color: undefined },
    {
      label: "Em andamento",
      value: emAndamento,
      color: CHART.status.andamento,
    },
    { label: "Atrasadas", value: atrasadas, color: CHART.status.atrasados },
    { label: "Concluídas", value: concluidas, color: CHART.status.concluidos },
  ];
  const donePct = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface-1 p-4"
          >
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
              {s.label}
            </p>
            <p
              className="text-2xl font-semibold tabular-nums"
              style={s.color ? { color: s.color } : undefined}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <p className="py-8 text-center text-sm text-text-2">
          Sem dados suficientes ainda.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatusDonut
            title="Tarefas por coluna"
            center={`${donePct}%`}
            centerLabel="concluído"
            rows={byColumn}
          />
          <section className="rounded-xl border border-border bg-surface-1 p-5">
            <h2 className="mb-4 text-sm font-semibold text-text-1">
              Atrasadas vs. em dia
            </h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overdueData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={CHART.grid}
                    strokeDasharray="3 6"
                    vertical={false}
                  />
                  <XAxis dataKey="name" {...CHART_AXIS} />
                  <YAxis {...CHART_AXIS} allowDecimals={false} width={28} />
                  <Tooltip
                    cursor={{ fill: "var(--surface-2)", opacity: 0.55 }}
                    content={<CountTooltip />}
                  />
                  <Bar
                    dataKey="value"
                    name="Cards"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  >
                    {overdueData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
