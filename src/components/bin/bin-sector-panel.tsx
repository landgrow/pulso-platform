"use client";

import { DiagCard } from "@/components/admin/diag-card";
import {
  BIN_SECTION_DESCRIPTIONS,
  binFaixaTone,
  binSectionColor,
} from "@/lib/bin-v2/client";
import type { BinFlowMeta, BinSectorRow } from "@/lib/bin-v2/client";
import { cn } from "@/lib/utils";

/** Cartões dos setores do BIN, com contagem e nota já calculadas no servidor. */
export function BinSectorPanel({
  rows: allRows,
  flow,
  selectedId,
  onSelect,
  showScore = false,
}: {
  rows: BinSectorRow[];
  flow: BinFlowMeta;
  selectedId?: string | null;
  onSelect?: (sectionId: string) => void;
  showScore?: boolean;
}): JSX.Element {
  const rows = allRows.filter((row) => {
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
        {rows.map((row) => (
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
                    score: row.scoreLabel ?? "",
                    scoreClass: binFaixaTone(row.faixa),
                  }
                : {})}
              {...(onSelect ? { onClick: () => onSelect(row.section.id) } : {})}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
