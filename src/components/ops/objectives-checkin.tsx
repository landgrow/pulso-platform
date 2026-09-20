"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  listWorksmartObjectives,
  updateWorksmartKeyResult,
} from "@/app/actions/worksmart";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  horizonChip,
  isObjectiveAchieved,
  krProgressLabel,
  krProgressPercent,
  objectiveProgressPercent,
} from "@/lib/worksmart/cascade";
import {
  WORKSMART_STATUS_LABELS,
  type WorksmartObjective,
} from "@/types/worksmart";

export function ObjectivesCheckin({ orgId }: { orgId?: string }): JSX.Element {
  const [objectives, setObjectives] = useState<WorksmartObjective[]>([]);
  const [wins, setWins] = useState<WorksmartObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  async function refresh(): Promise<void> {
    setLoading(true);
    const result = await listWorksmartObjectives(orgId);
    if (!result.success) toast.error(result.error);
    else {
      const achieved = result.data.filter(isObjectiveAchieved);
      setWins(achieved);
      setObjectives(
        result.data.filter(
          (objective) =>
            !isObjectiveAchieved(objective) && objective.keyResults.length > 0,
        ),
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh() sets loading on org change
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (loading) {
    return (
      <section className="rounded-lg border border-border bg-surface-1 p-5">
        <p className="flex items-center text-sm text-text-2">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Carregando objetivos da semana...
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface-1 p-5 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Objetivos da semana</h2>
          <p className="text-sm text-text-2 mt-1">
            Atualize o número. Card concluído não é faturamento — a meta anda
            aqui.
          </p>
        </div>
        <Link
          href="/admin/atividades"
          className="text-xs text-primary hover:underline shrink-0"
        >
          Abrir WorkSmart
        </Link>
      </header>

      {objectives.length === 0 ? (
        <p className="text-sm text-text-2">
          {wins.length > 0
            ? "Nenhum objetivo aberto. Os resultados ficam abaixo."
            : "Nenhum objetivo ativo com métrica. Gere o percurso em Atividades — depois o check-in aparece aqui."}
        </p>
      ) : (
        <ul className="space-y-4">
          {objectives.map((objective) => {
            const progress = objectiveProgressPercent(objective.keyResults);
            const chip = horizonChip(objective.smartTemporal, today);
            return (
              <li
                key={objective.id}
                className="rounded-md border border-border bg-background p-3 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {objective.title}
                    </p>
                    <p className="text-[11px] text-text-2 mt-0.5">
                      {WORKSMART_STATUS_LABELS[objective.status]}
                      {objective.orgName
                        ? ` · ${objective.orgName}`
                        : ""} · {Math.round(progress)}%
                    </p>
                  </div>
                  {chip ? <Badge variant="outline">{chip}</Badge> : null}
                </div>
                <div
                  className="h-1.5 rounded-full bg-surface-2 overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  aria-label={`${Math.round(progress)} por cento`}
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <ul className="space-y-2">
                  {objective.keyResults.map((kr) => (
                    <CheckinKrRow
                      key={kr.id}
                      krId={kr.id}
                      title={kr.title}
                      currentValue={kr.currentValue}
                      targetValue={kr.targetValue}
                      unit={kr.unit}
                      doneCards={kr.actions.filter((a) => a.done).length}
                      totalCards={kr.actions.length}
                      onSaved={() => void refresh()}
                    />
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      {wins.length > 0 ? (
        <div className="space-y-2 pt-2 border-t border-border">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-2">
            Resultados
          </h3>
          <ul className="space-y-2">
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
                : WORKSMART_STATUS_LABELS.concluido;
              return (
                <li
                  key={objective.id}
                  className="rounded-md border border-success/40 bg-success/10 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-text-1">
                    {objective.title}
                  </p>
                  <p className="text-[11px] text-text-2 mt-0.5">
                    Concluído
                    {objective.orgName ? ` · ${objective.orgName}` : ""}
                    {` · ${label}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function CheckinKrRow({
  krId,
  title,
  currentValue,
  targetValue,
  unit,
  doneCards,
  totalCards,
  onSaved,
}: {
  krId: string;
  title: string;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  doneCards: number;
  totalCards: number;
  onSaved: () => void;
}): JSX.Element {
  const [current, setCurrent] = useState(
    currentValue != null ? String(currentValue) : "",
  );
  const incoming = currentValue != null ? String(currentValue) : "";
  const [prevIncoming, setPrevIncoming] = useState(incoming);
  if (incoming !== prevIncoming) {
    setPrevIncoming(incoming);
    setCurrent(incoming);
  }

  const pct = krProgressPercent({
    current: currentValue,
    target: targetValue,
    doneCards,
    totalCards,
  });
  const label = krProgressLabel({
    current: currentValue,
    target: targetValue,
    unit,
    doneCards,
    totalCards,
  });

  async function save(): Promise<void> {
    const parsed = current.trim() === "" ? 0 : Number(current);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Número inválido");
      return;
    }
    if (parsed === (currentValue ?? 0)) return;
    const result = await updateWorksmartKeyResult({
      keyResultId: krId,
      currentValue: parsed,
    });
    if (!result.success) toast.error(result.error);
    else {
      toast.success("Métrica atualizada.");
      onSaved();
    }
  }

  return (
    <li className="grid grid-cols-[1fr_auto] gap-3 items-end">
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{title}</p>
        <p className="text-[11px] text-text-2">
          {Math.round(pct)}% · {label}
        </p>
      </div>
      {targetValue != null ? (
        <label className="space-y-1 w-24">
          <span className="block text-[11px] uppercase tracking-wide text-text-2">
            Atual
          </span>
          <Input
            type="number"
            min={0}
            step="any"
            className="h-8 text-sm"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            onBlur={() => void save()}
            aria-label={`Valor atual de ${title}`}
          />
        </label>
      ) : (
        <p className="text-[11px] text-text-2">
          {doneCards}/{totalCards} cards
        </p>
      )}
    </li>
  );
}
