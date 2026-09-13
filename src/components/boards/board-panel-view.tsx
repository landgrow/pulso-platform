"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    color: col.color,
  }));

  const overdueData = [
    { name: "Em dia", value: total - atrasadas - concluidas, color: "#3b82f6" },
    { name: "Atrasadas", value: atrasadas, color: "#ef4444" },
    { name: "Concluídas", value: concluidas, color: "#22c55e" },
  ];

  const stats = [
    { label: "Todas as tarefas", value: total, color: undefined },
    { label: "Em andamento", value: emAndamento, color: "#3b82f6" },
    { label: "Atrasadas", value: atrasadas, color: "#ef4444" },
    { label: "Concluídas", value: concluidas, color: "#22c55e" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-text-2 mb-1.5">{s.label}</p>
              <p
                className="text-2xl font-bold"
                style={s.color ? { color: s.color } : undefined}
              >
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {total === 0 ? (
        <p className="text-sm text-text-2 py-8 text-center">
          Sem dados suficientes ainda.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Tarefas por status
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byColumn}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                  >
                    {byColumn.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Atrasadas vs. em dia
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overdueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-2)" fontSize={12} />
                  <YAxis
                    stroke="var(--text-2)"
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {overdueData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
