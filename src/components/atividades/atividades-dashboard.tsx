"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ListTodo, CheckCircle2, AlertTriangle } from "lucide-react";
import { StatusDonut } from "@/components/charts";
import { CHART } from "@/lib/charts/theme";
import { getAtividadesDashboard } from "@/app/actions/boards";
import type { BoardModule } from "@/types/boards";

interface DashboardData {
  total_cards: number;
  concluidos: number;
  atrasados: number;
  por_setor: Record<string, number>;
  por_responsavel: Record<string, number>;
}

/** Resumo agregado de todos os kanbans de um módulo da org — total, concluídos, atrasados, por setor e por responsável. Usado por Atividades e CRM (mesma infraestrutura de boards). */
export function AtividadesDashboard({
  orgId,
  module = "atividades",
  title = "Dashboard",
  subtitle = "Resumo de todos os kanbans do Plano de Ação interno.",
}: {
  orgId: string;
  module?: BoardModule;
  title?: string;
  subtitle?: string;
}): JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh(): Promise<void> {
    setLoading(true);
    const result = await getAtividadesDashboard(orgId, module);
    if (!result.success) toast.error(result.error);
    else setData(result.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh() sets loading state, needed on every orgId/module change
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, module]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-2">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando dashboard...
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-text-2">
        Não foi possível carregar o dashboard.
      </p>
    );
  }

  const setorEntries = Object.entries(data.por_setor).sort(
    (a, b) => b[1] - a[1],
  );
  const responsavelEntries = Object.entries(data.por_responsavel).sort(
    (a, b) => b[1] - a[1],
  );
  const maxSetor = Math.max(1, ...setorEntries.map(([, v]) => v));
  const maxResponsavel = Math.max(1, ...responsavelEntries.map(([, v]) => v));

  const emAndamento = Math.max(
    0,
    data.total_cards - data.concluidos - data.atrasados,
  );
  const statusData = [
    { name: "Em andamento", value: emAndamento, color: CHART.status.andamento },
    { name: "Atrasados", value: data.atrasados, color: CHART.status.atrasados },
    {
      name: "Concluídos",
      value: data.concluidos,
      color: CHART.status.concluidos,
    },
  ];
  const donePct =
    data.total_cards > 0
      ? Math.round((data.concluidos / data.total_cards) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-text-2">{subtitle}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-text-2 text-xs font-medium uppercase tracking-wide">
            <ListTodo className="h-3.5 w-3.5" />
            Total de cards
          </div>
          <p className="text-2xl font-bold mt-1">{data.total_cards}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-text-2 text-xs font-medium uppercase tracking-wide">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Concluídos
          </div>
          <p className="text-2xl font-bold mt-1 text-success">
            {data.concluidos}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-text-2 text-xs font-medium uppercase tracking-wide">
            <AlertTriangle className="h-3.5 w-3.5" />
            Atrasados
          </div>
          <p className="text-2xl font-bold mt-1 text-error">{data.atrasados}</p>
        </div>
      </div>

      {data.total_cards > 0 ? (
        <StatusDonut
          title="Situação dos cards"
          center={`${donePct}%`}
          centerLabel="concluído"
          rows={statusData}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Por setor</h3>
          {setorEntries.length === 0 ? (
            <p className="text-xs text-text-2">
              Nenhum card com setor definido.
            </p>
          ) : (
            <div className="space-y-1.5">
              {setorEntries.map(([setor, total]) => (
                <div key={setor} className="flex items-center gap-2 text-sm">
                  <span className="w-28 shrink-0 truncate text-text-2">
                    {setor}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(total / maxSetor) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs text-text-2 tabular-nums">
                    {total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Por responsável</h3>
          {responsavelEntries.length === 0 ? (
            <p className="text-xs text-text-2">Nenhum card ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {responsavelEntries.map(([nome, total]) => (
                <div key={nome} className="flex items-center gap-2 text-sm">
                  <span className="w-28 shrink-0 truncate text-text-2">
                    {nome}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(total / maxResponsavel) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs text-text-2 tabular-nums">
                    {total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
