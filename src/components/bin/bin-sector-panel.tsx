"use client";

import { DiagCard } from "@/components/admin/diag-card";
import {
  BIN_SECTION_DESCRIPTIONS,
  binFaixaTone,
  binSectionColor,
  binSectionScoreLabel,
  countBinSection,
  packFor,
  scoreBinSection,
} from "@/lib/bin-v2";
import type { BinAnswers, BinFlowMeta, BinRoute } from "@/lib/bin-v2";
import { cn } from "@/lib/utils";

export function BinSectorPanel({
  answers,
  flow,
  route = null,
  selectedId,
  onSelect,
  showScore = false,
}: {
  answers: BinAnswers;
  flow: BinFlowMeta;
  route?: BinRoute | null;
  selectedId?: string | null;
  onSelect?: (sectionId: string) => void;
  showScore?: boolean;
}): JSX.Element {
  const pack = packFor(route);
  const rows = pack.instrument.sections
    .map((section, index) => {
      const { filled, total } = countBinSection(
        section,
        answers,
        pack.instrument,
      );
      const score = showScore
        ? scoreBinSection(section, answers, pack.instrument)
        : null;
      return { section, index, filled, total, score };
    })
    .filter((row) => {
      if (row.section.id === "geral") return true;
      if (row.filled > 0) return true;
      return Boolean(flow.geralEnviadoEm);
    });

  const filled = rows.reduce((n, row) => n + row.filled, 0);
  const total = rows.reduce((n, row) => n + row.total, 0);
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-1 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Setores do BIN</p>
        <p className="text-xs text-text-2">
          {filled} de {total} ({pct}%)
        </p>
      </div>
      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const scoreLabel =
            showScore && row.score ? binSectionScoreLabel(row.score) : null;
          return (
            <div
              key={row.section.id}
              className={cn(
                "h-full rounded-xl",
                selectedId === row.section.id ? "ring-2 ring-primary" : "",
              )}
            >
              <DiagCard
                index={row.index + 1}
                indexLabel={row.section.id === "geral" ? "Etapa" : "Área"}
                color={binSectionColor(row.section)}
                title={row.section.title}
                meta={BIN_SECTION_DESCRIPTIONS[row.section.id] ?? ""}
                total={row.total}
                respondidas={row.filled}
                countLabel="pergs."
                {...(showScore
                  ? {
                      score: scoreLabel ?? "",
                      scoreClass: binFaixaTone(row.score?.faixa ?? null),
                    }
                  : {})}
                {...(onSelect
                  ? { onClick: () => onSelect(row.section.id) }
                  : {})}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
