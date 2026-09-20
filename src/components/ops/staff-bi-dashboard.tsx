"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listWorksmartObjectives,
  updateWorksmartKeyResult,
} from "@/app/actions/worksmart";
import { FinanceCharts, StatusDonut } from "@/components/charts";
import { PdfExportButton } from "@/components/reports/pdf-export-button";
import { exportWorksmartPdf } from "@/app/actions/reports";
import { useDueFeed } from "@/hooks/use-due-feed";
import { CHART } from "@/lib/charts/theme";
import { splitDueCards } from "@/lib/ops/due";
import {
  isObjectiveAchieved,
  krProgressLabel,
  objectiveProgressPercent,
} from "@/lib/worksmart/cascade";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { WorksmartObjective } from "@/types/worksmart";
import type {
  FinanceCashMonth,
  FinanceEntryOrigin,
  MonthBalance,
} from "@/types/financeiro";

export interface StaffBiStats {
  totalCards: number;
  concluidos: number;
  atrasados: number;
  porSetor: Record<string, number>;
  porResponsavel: Record<string, number>;
}

export function StaffBiDashboard({
  userName,
  stats,
  crmLeads,
  crmConvertidos,
  crmConversion,
  receitaBrl,
  receitaContratosBrl,
  receitaObjetivosBrl,
  finance,
}: {
  userName: string;
  stats: StaffBiStats | null;
  crmLeads: number;
  crmConvertidos: number;
  crmConversion: number | null;
  receitaBrl: number;
  receitaContratosBrl: number;
  receitaObjetivosBrl: number;
  finance: {
    mes: string;
    livroMes: MonthBalance;
    cashflow: FinanceCashMonth[];
    entradasPorOrigem: Partial<Record<FinanceEntryOrigin, number>>;
  } | null;
}): JSX.Element {
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
  const total = stats?.totalCards ?? 0;
  const done = stats?.concluidos ?? 0;
  const late = stats?.atrasados ?? 0;
  const running = Math.max(0, total - done - late);
  const donePct = total > 0 ? Math.round((done / total) * 100) : 0;

  const statusData = [
    { name: "Em execução", value: running, color: CHART.status.andamento },
    { name: "Atrasados", value: late, color: CHART.status.atrasados },
    { name: "Concluídos", value: done, color: CHART.status.concluidos },
  ];
  const livroMes = finance?.livroMes ?? null;
  const hasBook = Boolean(
    livroMes && (livroMes.entradas > 0 || livroMes.saidas > 0),
  );

  return (
    <div className="max-w-[1280px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-3">
            Negócio · {today}
          </p>
          <h1 className="mt-1 text-[1.75rem] font-semibold tracking-tight text-text-1">
            {userName}
          </h1>
        </div>
        <nav className="flex gap-4 text-sm text-text-2">
          <Link href="/admin/financeiro" className="hover:text-text-1">
            Financeiro
          </Link>
          <Link href="/admin/metricas" className="hover:text-text-1">
            Métricas
          </Link>
          <Link href="/admin/crm" className="hover:text-text-1">
            CRM
          </Link>
          <Link href="/admin/atividades" className="hover:text-text-1">
            Atividades
          </Link>
          <Link href="/admin/painel" className="hover:text-text-1">
            Painel
          </Link>
        </nav>
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-surface-1">
        <div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-4 lg:divide-y-0">
          <Kpi
            label="Entrou"
            value={formatCurrency(livroMes?.entradas ?? 0)}
            hint={hasBook ? "livro do mês" : "ainda sem entrada neste mês"}
            tone="lime"
          />
          <Kpi
            label="Saiu"
            value={formatCurrency(livroMes?.saidas ?? 0)}
            hint={
              livroMes
                ? `imposto ${formatCurrency(livroMes.impostosNotas)}`
                : "despesas do mês"
            }
            tone={livroMes && livroMes.saidas > 0 ? "danger" : "muted"}
          />
          <Kpi
            label={hasBook ? "Balanço do mês" : "Receita ativa"}
            value={formatCurrency(hasBook ? livroMes!.balanco : receitaBrl)}
            hint={
              hasBook
                ? `líquido ${formatCurrency(livroMes!.liquido)}`
                : [
                    receitaObjetivosBrl > 0
                      ? `${formatCurrency(receitaObjetivosBrl)} da meta`
                      : null,
                    `${formatCurrency(receitaContratosBrl)} em contrato`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
            }
            tone="lime"
          />
          <Kpi
            label="CRM"
            value={String(crmConvertidos)}
            hint={
              crmConversion == null
                ? `${crmLeads} no funil`
                : `${Math.round(crmConversion)}% · ${crmLeads} no funil`
            }
          />
        </div>
      </section>

      {finance ? (
        <FinanceCharts
          month={finance.mes}
          cashflow={finance.cashflow}
          livroMes={finance.livroMes}
          entradasPorOrigem={finance.entradasPorOrigem}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
        <div className="space-y-4">
          <StatusDonut
            title="Execução interna"
            hint={`${total} cards · ${donePct}% concluído`}
            center={`${donePct}%`}
            centerLabel="feito"
            rows={statusData}
          />
          <section className="rounded-xl border border-border bg-surface-1 p-5">
            <div className="grid gap-8 sm:grid-cols-2">
              <BarList title="Setor" values={stats?.porSetor ?? {}} />
              <BarList
                title="Responsável"
                values={stats?.porResponsavel ?? {}}
              />
            </div>
          </section>
        </div>
        <div className="space-y-4">
          <DuePulse />
          <ResultsPulse />
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "danger" | "lime" | "muted";
}): JSX.Element {
  return (
    <div className="px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-3">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-[1.65rem] font-semibold tabular-nums tracking-tight",
          tone === "danger" && "text-error",
          tone === "lime" && "text-brand-lime",
          (tone === "default" || tone === "muted") && "text-text-1",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-text-3">{hint}</p>
    </div>
  );
}

function BarList({
  title,
  values,
}: {
  title: string;
  values: Record<string, number>;
}): JSX.Element {
  const rows = Object.entries(values)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-3">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-text-2">Sem distribuição ainda.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map(([name, total]) => (
            <li key={name} className="space-y-1">
              <div className="flex justify-between gap-2 text-xs">
                <span className="truncate text-text-2">{name}</span>
                <span className="tabular-nums text-text-1">{total}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(total / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DuePulse(): JSX.Element {
  const feed = useDueFeed();
  const cards = feed.cards.filter((card) => card.isInternal);
  const split = splitDueCards(cards, feed.today);
  const rows = [...split.atrasadas, ...split.hoje, ...split.aVencer].slice(
    0,
    6,
  );

  return (
    <section className="rounded-xl border border-border bg-surface-1 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-1">Fila</h2>
        <p className="text-[11px] tabular-nums text-text-3">
          {split.atrasadas.length} atrasada
          {split.atrasadas.length === 1 ? "" : "s"} · {split.hoje.length} hoje ·{" "}
          {split.aVencer.length} à frente
        </p>
      </div>
      {feed.loading ? (
        <p className="mt-6 text-sm text-text-2">Carregando prazos…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-text-2">Nada atrasado ou a vencer.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((card) => {
            const late = card.prazo < feed.today;
            return (
              <li key={card.id}>
                <Link
                  href={card.href}
                  className="flex items-center justify-between gap-3 py-2.5 hover:text-primary"
                >
                  <span className="min-w-0 truncate text-sm text-text-1">
                    {card.titulo}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[11px] tabular-nums",
                      late ? "text-error" : "text-text-3",
                    )}
                  >
                    {late ? "atrasada" : formatDate(card.prazo)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ResultsPulse(): JSX.Element {
  const [open, setOpen] = useState<WorksmartObjective[]>([]);
  const [wins, setWins] = useState<WorksmartObjective[]>([]);

  async function refresh(): Promise<void> {
    const result = await listWorksmartObjectives();
    if (!result.success) return;
    setWins(result.data.filter(isObjectiveAchieved));
    setOpen(
      result.data.filter(
        (objective) =>
          !isObjectiveAchieved(objective) && objective.keyResults.length > 0,
      ),
    );
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega OKRs ao abrir o dashboard
    void refresh();
  }, []);

  return (
    <section className="rounded-xl border border-border bg-surface-1 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-1">Objetivos</h2>
        <div className="flex items-center gap-2">
          <PdfExportButton label="PDF" run={() => exportWorksmartPdf()} />
          <Link
            href="/admin/atividades"
            className="text-[11px] text-text-3 hover:text-text-1"
          >
            WorkSmart
          </Link>
        </div>
      </div>

      {open.length === 0 && wins.length === 0 ? (
        <p className="mt-6 text-sm text-text-2">
          Nenhum objetivo com métrica ainda.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {open.map((objective) => {
            const kr = objective.keyResults[0];
            const pct = Math.round(
              objectiveProgressPercent(objective.keyResults),
            );
            return (
              <li key={objective.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-text-1">
                    {objective.title}
                  </p>
                  <span className="text-[11px] tabular-nums text-text-3">
                    {pct}%
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {kr && kr.targetValue != null ? (
                  <CheckinInput
                    krId={kr.id}
                    currentValue={kr.currentValue}
                    onSaved={() => void refresh()}
                  />
                ) : null}
              </li>
            );
          })}
          {wins.map((objective) => {
            const kr = objective.keyResults[0];
            const label = kr
              ? krProgressLabel({
                  current: kr.currentValue,
                  target: kr.targetValue,
                  unit: kr.unit,
                  doneCards: kr.actions.filter((a) => a.done).length,
                  totalCards: kr.actions.length,
                })
              : "Concluído";
            return (
              <li
                key={objective.id}
                className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-0 first:pt-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-1">
                    {objective.title}
                  </p>
                  <p className="text-[11px] text-text-3">
                    Resultado
                    {objective.orgName ? ` · ${objective.orgName}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-brand-lime">
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CheckinInput({
  krId,
  currentValue,
  onSaved,
}: {
  krId: string;
  currentValue: number | null;
  onSaved: () => void;
}): JSX.Element {
  const [current, setCurrent] = useState(
    currentValue != null ? String(currentValue) : "",
  );

  async function save(): Promise<void> {
    const parsed = current.trim() === "" ? 0 : Number(current);
    if (!Number.isFinite(parsed) || parsed === (currentValue ?? 0)) return;
    const result = await updateWorksmartKeyResult({
      keyResultId: krId,
      currentValue: parsed,
    });
    if (result.success) onSaved();
  }

  return (
    <input
      type="number"
      min={0}
      step="any"
      value={current}
      onChange={(e) => setCurrent(e.target.value)}
      onBlur={() => void save()}
      aria-label="Atualizar métrica"
      className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs tabular-nums text-text-1 outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}
