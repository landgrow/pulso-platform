"use client";

import { useState } from "react";
import { Compass, Mountain, Radar, Route, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChartFrame } from "@/components/charts/chart-frame";
import { BinScoreBars, BinSpiderChart } from "@/components/bin/bin-radar-chart";
import {
  binFaixaColor,
  binSectionColor,
  formatBinNota,
} from "@/lib/bin-v2/client";
import type {
  BinDeliverable,
  BinDeliverableKind,
  BinDeliverableSet,
  BinFlowMeta,
  BinGateResult,
  BinReadingView,
  BinSectionReading,
} from "@/lib/bin-v2/client";
import { cn } from "@/lib/utils";

const GATE_LABEL: Record<string, string> = {
  disparado: "Disparado",
  nao_gera: "Não gera",
  folego_curto: "Fôlego curto",
  subordinado: "Subordinado",
  aguardando: "Aguardando",
  nao_disparado: "Livre",
  gera: "Gera",
  avaliado: "Aberto",
};

const KIND_ICON: Record<BinDeliverableKind, typeof Radar> = {
  radar: Radar,
  compass: Compass,
  horizon: Mountain,
  route_planner: Route,
};

const KIND_TINT: Record<BinDeliverableKind, string> = {
  radar: "var(--primary)",
  compass: "#22D3EE",
  horizon: "#B45309",
  route_planner: "#6366F1",
};

function gateTone(status: string): {
  badge: "destructive" | "warning" | "outline" | "success";
  color: string;
} {
  if (status === "disparado" || status === "nao_gera") {
    return { badge: "destructive", color: "#B42318" };
  }
  if (status === "folego_curto" || status === "subordinado") {
    return { badge: "warning", color: "#B45309" };
  }
  if (status === "aguardando") {
    return { badge: "outline", color: "#94A3B8" };
  }
  return { badge: "success", color: "#15803D" };
}

function GateStrip({
  gates,
}: {
  gates: [BinGateResult, BinGateResult, BinGateResult];
}): JSX.Element {
  return (
    <div className="relative grid gap-3 md:grid-cols-3">
      <div
        className="pointer-events-none absolute top-7 right-8 left-8 hidden h-px bg-border md:block"
        aria-hidden
      />
      {gates.map((gate, index) => {
        const tone = gateTone(gate.status);
        return (
          <article
            key={gate.id}
            className="relative rounded-xl border border-border bg-surface-1 px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ background: tone.color }}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{gate.nome}</p>
                <Badge variant={tone.badge} className="mt-1">
                  {GATE_LABEL[gate.status] ?? gate.status}
                </Badge>
              </div>
            </div>
            <p className="mt-3 text-xs leading-snug text-text-2">
              {gate.resumo}
            </p>
            {gate.hits.length > 0 ? (
              <ul className="mt-2 space-y-1 text-[11px] text-text-3">
                {gate.hits.slice(0, 3).map((hit) => (
                  <li key={`${hit.questionId}-${hit.label}`}>
                    {hit.questionId} · {hit.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function ScoreRing({
  nota,
  faixa,
}: {
  nota: number;
  faixa: string | null;
}): JSX.Element {
  const color = binFaixaColor(faixa);
  const pct = Math.max(0, Math.min(100, nota));
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="10"
        />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-semibold tabular-nums leading-none"
          style={{ color }}
        >
          {formatBinNota(nota)}
        </span>
        <span
          className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em]"
          style={{ color }}
        >
          {faixa ?? "cobertura"}
        </span>
      </div>
    </div>
  );
}

function DeliverableCard({ item }: { item: BinDeliverable }): JSX.Element {
  const Icon = KIND_ICON[item.kind];
  const tint = KIND_TINT[item.kind];
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface-1">
      <div className="h-1" style={{ background: tint }} />
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" style={{ color: tint }} />
            <div>
              <p className="text-sm font-semibold">{item.nome}</p>
              <p className="text-[11px] text-text-3">{item.desc}</p>
            </div>
          </div>
          <Badge variant={item.status === "parcial" ? "warning" : "success"}>
            {item.status === "parcial" ? "Parcial" : "Pronto"}
          </Badge>
        </div>
        <p className="mt-3 text-sm font-medium leading-snug">{item.headline}</p>
        <ul className="mt-2 space-y-1.5 text-sm text-text-2">
          {item.bullets.map((bullet) => (
            <li key={bullet.slice(0, 80)} className="leading-snug">
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function SectorHero({ row }: { row: BinSectionReading }): JSX.Element {
  const color = binSectionColor(row.section);
  const score = row.score;
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface-1">
      <div className="h-1.5" style={{ background: color }} />
      <div className="flex flex-wrap items-center gap-6 px-5 py-5">
        {score.status === "nota" && score.nota !== null ? (
          <ScoreRing nota={score.nota} faixa={score.faixa} />
        ) : (
          <div className="flex h-36 w-36 items-center justify-center rounded-full border border-dashed border-border text-sm text-text-3">
            Sem nota
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-3">
            RADAR · {row.section.title}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {row.section.title}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {score.faixa ? (
              <Badge
                className="border-transparent text-white"
                style={{ background: binFaixaColor(score.faixa) }}
              >
                {score.faixa}
              </Badge>
            ) : null}
            {score.tetoSetor !== null && score.tetoSetor < 100 ? (
              <Badge variant="warning">Teto {score.tetoSetor}</Badge>
            ) : null}
            {score.notaBruta !== null ? (
              <Badge variant="outline">
                Bruta {formatBinNota(score.notaBruta)}
              </Badge>
            ) : null}
            {score.cobertura ? (
              <Badge variant="outline">
                {score.cobertura.existem} de {score.cobertura.total} elementos
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Leitura do BIN (portões, radar, entregáveis). Recebe o resultado já
 * calculado no servidor — o método (pesos, gatilhos) não vem para a tela.
 */
export function BinReadingPanel({
  view,
  flow,
  selectedSectionId,
  onSelectSection,
}: {
  view: BinReadingView;
  flow: BinFlowMeta;
  selectedSectionId?: string | null;
  onSelectSection?: (sectionId: string | null) => void;
}): JSX.Element | null {
  const { reading, sets } = view;
  const controlled = selectedSectionId !== undefined;
  const [internalScope, setInternalScope] = useState<string | null>(
    selectedSectionId ?? null,
  );
  const scope = controlled ? (selectedSectionId ?? null) : internalScope;

  const active: BinDeliverableSet = sets.find(
    (set) => set.sectionId === scope,
  ) ??
    sets[0] ?? {
      sectionId: null,
      sectionTitle: null,
      items: [],
    };
  const activeRow =
    reading.sections.find((row) => row.section.id === active.sectionId) ?? null;

  if (reading.completedSectionIds.length === 0 && !flow.geralEnviadoEm) {
    return null;
  }

  const { portao1, portao2, portao3 } = reading.gates;
  const scoredCount = reading.sections.filter(
    (row) =>
      row.section.id !== "geral" &&
      row.submitted &&
      row.score.status === "nota",
  ).length;

  function selectScope(sectionId: string | null) {
    if (!controlled) setInternalScope(sectionId);
    onSelectSection?.(sectionId);
  }

  return (
    <div className="space-y-5">
      <ChartFrame
        eyebrow="Prioridade"
        title="Portões da análise"
        hint="Continuidade, depois fôlego, depois estrutura. A nota setorial não muda a ordem."
      >
        <GateStrip gates={[portao1, portao2, portao3]} />
      </ChartFrame>

      {reading.flags.length > 0 ? (
        <div className="rounded-xl border border-border bg-surface-1 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" />
            <p className="text-sm font-medium">Inconsistências na leitura</p>
            <Badge variant="warning">{reading.flags.length}</Badge>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {reading.flags.map((flag) => (
              <li
                key={flag.regra}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium text-text-1">
                  {flag.regra} · {flag.classe}
                </span>
                <p className="mt-0.5 text-xs text-text-2">{flag.resumo}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <ChartFrame
          eyebrow="RADAR"
          title="Notas dos setores já respondidos"
          hint={
            scoredCount === 0
              ? "Ainda não há setor com nota. Envie um setor pontuável."
              : "Sem média geral. Cada eixo é um setor enviado."
          }
        >
          <BinSpiderChart sections={reading.sections} />
        </ChartFrame>
        <ChartFrame
          eyebrow="Faixas"
          title="0 a 100 por setor"
          hint="A marca vertical é o teto quando peso 8 zerou."
        >
          <BinScoreBars
            sections={reading.sections}
            selectedId={scope}
            onSelect={(sectionId) => selectScope(sectionId)}
          />
        </ChartFrame>
      </div>

      {sets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {sets.map((set) => {
            const id = set.sectionId ?? "conjunto";
            const activeScope = (scope ?? null) === set.sectionId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectScope(set.sectionId)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  activeScope
                    ? "border-primary bg-primary/10 text-text-1"
                    : "border-border text-text-2 hover:text-text-1",
                )}
              >
                {set.sectionTitle ?? "Todos os respondidos"}
              </button>
            );
          })}
        </div>
      ) : null}

      {activeRow ? <SectorHero row={activeRow} /> : null}

      {active.items.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {active.items.map((item) => (
            <DeliverableCard
              key={`${item.kind}-${item.sectionId ?? "all"}`}
              item={item}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-2">
          Envie um setor para gerar Radar, Compass, Horizon e Route Planner
          daquele recorte. Os quatro se atualizam a cada novo setor.
        </p>
      )}
    </div>
  );
}
