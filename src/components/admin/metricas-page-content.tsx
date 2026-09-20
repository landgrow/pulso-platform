"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Contact,
  CheckCircle2,
  TrendingUp,
  Wallet,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { getMetricasGerais, type MetricasGerais } from "@/app/actions/metricas";
import { FinanceCharts } from "@/components/charts";
import { PROGRAMA_LABELS, type Programa } from "@/types/clientes";
import { monthLabel } from "@/lib/financeiro/ledger";
import { formatCurrency } from "@/lib/utils";

const STATUS_LABELS = {
  ativo: "Ativos",
  pausado: "Pausados",
  encerrado: "Encerrados",
} as const;

function Bar({
  label,
  total,
  max,
}: {
  label: string;
  total: number;
  max: number;
}): JSX.Element {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-32 shrink-0 truncate text-text-2">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full bg-primary"
          style={{ width: `${max > 0 ? (total / max) * 100 : 0}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs text-text-2 tabular-nums">
        {total}
      </span>
    </div>
  );
}

/** Painel de Métricas gerais da Land Grow — funil de CRM (todos os kanbans) + financeiro real (tabela contratos). */
export function MetricasPageContent(): JSX.Element {
  const [data, setData] = useState<MetricasGerais | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function refresh(): Promise<void> {
      setLoading(true);
      const result = await getMetricasGerais();
      if (!result.success) toast.error(result.error);
      else setData(result.data);
      setLoading(false);
    }
    void refresh();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-2">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando métricas...
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-text-2">
        Não foi possível carregar as métricas.
      </p>
    );
  }

  const { crm, financeiro, bridges } = data;
  const kanbanEntries = [...crm.porKanban].sort((a, b) => b.total - a.total);
  const setorEntries = Object.entries(crm.porSetor).sort((a, b) => b[1] - a[1]);
  const maxKanban = Math.max(1, ...kanbanEntries.map((k) => k.total));
  const maxSetor = Math.max(1, ...setorEntries.map(([, v]) => v));

  const moedas = Object.keys(financeiro.receitaAtivaPorMoeda) as Array<
    keyof typeof financeiro.receitaAtivaPorMoeda
  >;
  const maxStatus = Math.max(1, ...Object.values(financeiro.porStatus));

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-text-2" />
            <h2 className="text-lg font-semibold">
              Financeiro · {monthLabel(financeiro.mes)}
            </h2>
          </div>
          <Link
            href="/admin/financeiro"
            className="text-sm text-primary hover:underline"
          >
            Abrir o livro do mês
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
          <div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-4 lg:divide-y-0">
            <div className="px-4 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-3">
                Entrou
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-chart-in">
                {formatCurrency(financeiro.livroMes.entradas)}
              </p>
            </div>
            <div className="px-4 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-3">
                Imposto das notas
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {formatCurrency(financeiro.livroMes.impostosNotas)}
              </p>
            </div>
            <div className="px-4 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-3">
                Saiu
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {formatCurrency(financeiro.livroMes.saidas)}
              </p>
            </div>
            <div className="px-4 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-3">
                Balanço
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-chart-in">
                {formatCurrency(financeiro.livroMes.balanco)}
              </p>
              <p className="mt-0.5 text-xs text-text-3">
                líquido {formatCurrency(financeiro.livroMes.liquido)}
                {financeiro.receitaObjetivosBrl > 0
                  ? ` · meta ${formatCurrency(financeiro.receitaObjetivosBrl)}`
                  : ""}
                {financeiro.receitaContratosBrl > 0
                  ? ` · contrato ${formatCurrency(financeiro.receitaContratosBrl)}`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        <FinanceCharts
          month={financeiro.mes}
          cashflow={financeiro.cashflow}
          livroMes={financeiro.livroMes}
          entradasPorOrigem={financeiro.entradasPorOrigem}
        />
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Contact className="h-4 w-4 text-text-2" />
          <h2 className="text-lg font-semibold">CRM</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <div className="flex items-center gap-2 text-text-2 text-xs font-medium uppercase tracking-wide">
              <Contact className="h-3.5 w-3.5" />
              Total de cards
            </div>
            <p className="text-2xl font-bold mt-1">{crm.totalCards}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <div className="flex items-center gap-2 text-text-2 text-xs font-medium uppercase tracking-wide">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Convertidos em cliente
            </div>
            <p className="text-2xl font-bold mt-1 text-success">
              {crm.convertidos}
            </p>
            {bridges.clientesObjetivos > 0 ? (
              <p className="mt-1 text-xs text-text-3">
                {bridges.clientesObjetivos} vindos da meta WorkSmart
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <div className="flex items-center gap-2 text-text-2 text-xs font-medium uppercase tracking-wide">
              <TrendingUp className="h-3.5 w-3.5" />
              Taxa de conversão
            </div>
            <p className="text-2xl font-bold mt-1">
              {crm.taxaConversao.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Por kanban</h3>
            {kanbanEntries.length === 0 ? (
              <p className="text-xs text-text-2">
                Nenhum kanban de CRM criado ainda.
              </p>
            ) : (
              <div className="space-y-1.5">
                {kanbanEntries.map((k) => (
                  <Bar
                    key={k.boardId}
                    label={k.nome}
                    total={k.total}
                    max={maxKanban}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Por setor</h3>
            {setorEntries.length === 0 ? (
              <p className="text-xs text-text-2">
                Nenhum card com setor definido.
              </p>
            ) : (
              <div className="space-y-1.5">
                {setorEntries.map(([setor, total]) => (
                  <Bar key={setor} label={setor} total={total} max={maxSetor} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-text-2" />
              Contratos por status ({financeiro.totalContratos} no total)
            </h3>
            <div className="space-y-1.5">
              {(
                Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>
              ).map((status) => (
                <Bar
                  key={status}
                  label={STATUS_LABELS[status]}
                  total={financeiro.porStatus[status]}
                  max={maxStatus}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Receita ativa por programa
            </h3>
            {moedas.length === 0 ? (
              <p className="text-xs text-text-2">Sem dados ainda.</p>
            ) : (
              <div className="space-y-4">
                {moedas.map((moeda) => {
                  const porPrograma =
                    financeiro.receitaPorProgramaEMoeda[moeda] ?? {};
                  const entries = Object.entries(porPrograma) as Array<
                    [Programa, number]
                  >;
                  if (entries.length === 0) return null;
                  return (
                    <div key={moeda} className="space-y-1.5">
                      {moedas.length > 1 && (
                        <p className="text-xs text-text-2 font-medium">
                          {moeda}
                        </p>
                      )}
                      {entries
                        .sort((a, b) => b[1] - a[1])
                        .map(([programa, total]) => (
                          <div
                            key={programa}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="truncate text-text-2">
                              {PROGRAMA_LABELS[programa]}
                            </span>
                            <span className="shrink-0 font-medium tabular-nums">
                              {formatCurrency(total, moeda)}
                            </span>
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
