"use client";

import { Circle, CircleDot, CheckCircle2 } from "lucide-react";
import {
  diagStatusKey,
  DIAG_STATUS_LABELS,
  type DiagStatus,
} from "@/data/diagnostico-demo";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<DiagStatus, string> = {
  "nao-iniciado": "text-text-2",
  andamento: "text-primary",
  concluido: "text-success",
};

const STATUS_BG_CLASS: Record<DiagStatus, string> = {
  "nao-iniciado": "bg-text-2",
  andamento: "bg-primary",
  concluido: "bg-success",
};

const STATUS_ICON: Record<DiagStatus, typeof Circle> = {
  "nao-iniciado": Circle,
  andamento: CircleDot,
  concluido: CheckCircle2,
};

/** Card de setor (BIN) ou bloco (MIN) — mesmo padrão visual do protótipo (renderDiagCard): ícone colorido, título, meta (descrição ou tags), status derivado de respondidas/total, barra de progresso. */
export function DiagCard({
  index,
  indexLabel,
  color,
  title,
  meta,
  total,
  respondidas,
  countLabel = "perguntas",
  onClick,
}: {
  index: number;
  indexLabel: string;
  color: string;
  title: string;
  meta: string | string[];
  total: number;
  respondidas: number;
  countLabel?: string;
  onClick?: () => void;
}): JSX.Element {
  const status = diagStatusKey(respondidas, total);
  const pct = total > 0 ? Math.round((respondidas / total) * 100) : 0;
  const StatusIcon = STATUS_ICON[status];

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="text-left rounded-xl border border-border bg-surface-1 p-4 flex flex-col gap-2.5 hover:border-text-2/40 transition-colors disabled:cursor-default"
    >
      <div className="flex items-center justify-between">
        <span
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}24`, color }}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: color }}
          />
        </span>
        <span className="text-[11px] text-text-2">
          {indexLabel} #{index}
        </span>
      </div>
      <div className="text-sm font-semibold" style={{ color }}>
        {title}
      </div>
      {Array.isArray(meta) ? (
        <div className="flex flex-wrap gap-1.5">
          {meta.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-text-2"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-2 leading-snug">{meta}</p>
      )}
      <div className="flex items-center justify-between text-[11px]">
        <span
          className={cn("inline-flex items-center gap-1", STATUS_CLASS[status])}
        >
          <StatusIcon className="h-3 w-3" />
          {DIAG_STATUS_LABELS[status]}
        </span>
        <span className="text-text-2">
          {respondidas}/{total} {countLabel}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className={cn("h-full", STATUS_BG_CLASS[status])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  );
}
