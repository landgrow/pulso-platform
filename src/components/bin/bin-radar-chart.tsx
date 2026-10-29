"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  binFaixaColor,
  binSectionColor,
  formatBinNota,
} from "@/lib/bin-v2/client";
import type { BinSectionReading } from "@/lib/bin-v2/client";
import { cn } from "@/lib/utils";

type RadarRow = {
  setor: string;
  id: string;
  nota: number;
  faixa: string | null;
  fill: string;
};

function scoredRows(sections: BinSectionReading[]): RadarRow[] {
  return sections
    .filter(
      (row) =>
        row.section.id !== "geral" &&
        row.submitted &&
        row.score.status === "nota" &&
        row.score.nota !== null,
    )
    .map((row) => ({
      setor: row.section.title,
      id: row.section.id,
      nota: row.score.nota ?? 0,
      faixa: row.score.faixa,
      fill: binFaixaColor(row.score.faixa),
    }));
}

function BinRadarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: RadarRow }>;
}): JSX.Element | null {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-1 px-3 py-2 shadow-[0_12px_32px_rgba(10,15,30,0.14)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
        {row.setor}
      </p>
      <p className="mt-1 text-sm tabular-nums text-text-1">
        {formatBinNota(row.nota)}
        {row.faixa ? ` · ${row.faixa}` : ""}
      </p>
    </div>
  );
}

export function BinSpiderChart({
  sections,
}: {
  sections: BinSectionReading[];
}): JSX.Element {
  const data = scoredRows(sections);
  if (data.length < 3) {
    return (
      <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-text-2">
        O radar fecha quando pelo menos três setores tiverem nota. Até lá, leia
        as barras ao lado.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="setor"
            tick={{ fill: "var(--text-2)", fontSize: 11 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tickCount={6}
            tick={{ fill: "var(--text-3)", fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            name="Nota"
            dataKey="nota"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.22}
            strokeWidth={2}
          />
          <Tooltip content={<BinRadarTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BinScoreBars({
  sections,
  selectedId,
  onSelect,
}: {
  sections: BinSectionReading[];
  selectedId?: string | null;
  onSelect?: (sectionId: string) => void;
}): JSX.Element {
  const rows = sections.filter((row) => row.section.id !== "geral");

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const nota = row.score.nota;
        const ready =
          row.submitted && row.score.status === "nota" && nota !== null;
        const color = ready
          ? binFaixaColor(row.score.faixa)
          : binSectionColor(row.section);
        const width = ready ? Math.max(4, Math.min(100, nota ?? 0)) : 0;
        const label = !row.submitted
          ? "Aguardando"
          : row.score.status === "nao_avaliavel"
            ? "Sem nota"
            : row.score.status === "incompleto"
              ? "Incompleto"
              : ready
                ? `${formatBinNota(nota ?? 0)}${row.score.faixa ? ` · ${row.score.faixa}` : ""}`
                : "—";
        const teto =
          ready &&
          row.score.tetoSetor !== null &&
          (row.score.tetoSetor ?? 100) < 100
            ? row.score.tetoSetor
            : null;

        return (
          <li key={row.section.id}>
            <button
              type="button"
              onClick={() => onSelect?.(row.section.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors",
                selectedId === row.section.id
                  ? "bg-primary/8"
                  : "hover:bg-surface-2",
                !onSelect ? "cursor-default" : "",
              )}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: color }}
              />
              <span className="w-[7.5rem] shrink-0 truncate text-sm text-text-1">
                {row.section.title}
              </span>
              <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${width}%`, background: color }}
                />
                {teto !== null ? (
                  <span
                    className="absolute top-[-3px] h-3.5 w-px bg-text-3"
                    style={{ left: `${teto}%` }}
                    title={`Teto ${teto}`}
                  />
                ) : null}
              </span>
              <span
                className="w-[7.5rem] shrink-0 text-right text-xs tabular-nums"
                style={{ color: ready ? color : "var(--text-3)" }}
              >
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
