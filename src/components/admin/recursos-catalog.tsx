"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MenuSelect } from "@/components/ui/menu-select";
import { KpiCard, PageHeader } from "@/components/ui/page-header";
import {
  RESOURCE_AXIS_LABEL,
  RESOURCE_AXES,
  RESOURCE_STATUS_LABEL,
  applyStatusOverrides,
  canEnterPlan,
  countByStatus,
  isResourceStatus,
  surfaceLabel,
  type PulsoResource,
  type ResourceAxis,
  type ResourceKind,
  type ResourceStatus,
  type ResourceSurface,
} from "@/lib/recursos/catalog";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "pulso.recursos-catalog.status";

type StatusFilter = ResourceStatus | "todos";
type SurfaceFilter = ResourceSurface | "todas";
type KindFilter = ResourceKind | "todos";

const STATUS_OPTIONS = [
  { value: "pronto", label: "Pronto" },
  { value: "validando", label: "Validando" },
  { value: "rascunho", label: "Rascunho" },
];

function statusBadge(
  status: ResourceStatus,
): "success" | "warning" | "outline" {
  if (status === "pronto") return "success";
  if (status === "validando") return "warning";
  return "outline";
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-xs font-medium transition-colors duration-150",
        active
          ? "border-primary bg-surface-2 text-text-1"
          : "border-border bg-transparent text-text-2 hover:bg-surface-2 hover:text-text-1",
      )}
    >
      {children}
    </button>
  );
}

export function RecursosCatalog({
  resources,
}: {
  resources: PulsoResource[];
}): JSX.Element {
  const [overrides, setOverrides] = useState<Record<string, ResourceStatus>>(
    {},
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [surfaceFilter, setSurfaceFilter] = useState<SurfaceFilter>("todas");
  const [kindFilter, setKindFilter] = useState<KindFilter>("todos");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      const next: Record<string, ResourceStatus> = {};
      for (const [id, value] of Object.entries(parsed)) {
        if (typeof value === "string" && isResourceStatus(value)) {
          next[id] = value;
        }
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o localStorage (sistema externo) uma vez ao montar
      setOverrides(next);
    } catch {
      setOverrides({});
    }
  }, []);

  function persist(next: Record<string, ResourceStatus>): void {
    setOverrides(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const items = useMemo(
    () => applyStatusOverrides(resources, overrides),
    [resources, overrides],
  );
  const counts = countByStatus(items);
  const visible = items.filter((item) => {
    if (statusFilter !== "todos" && item.status !== statusFilter) return false;
    if (surfaceFilter !== "todas" && !item.surfaces.includes(surfaceFilter)) {
      return false;
    }
    if (kindFilter !== "todos" && item.kind !== kindFilter) return false;
    return true;
  });

  const grouped = RESOURCE_AXES.map((axis) => ({
    axis,
    rows: visible.filter((item) => item.axis === axis),
  })).filter((group) => group.rows.length > 0);

  function setStatus(id: string, status: ResourceStatus): void {
    const base = resources.find((item) => item.id === id);
    const next = { ...overrides };
    if (!base || base.status === status) {
      delete next[id];
    } else {
      next[id] = status;
    }
    persist(next);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recursos"
        description="O que o PULSO já tem, o que ainda está em prova e o que só entra depois de passar no filtro. Isto não vende plano."
        actions={
          Object.keys(overrides).length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => persist({})}
            >
              Voltar aos status originais
            </Button>
          ) : null
        }
      />

      <p className="text-xs text-text-3">
        Mudar o status nesta tela grava só neste navegador. O Financeiro
        continua como está — só a equipe Land Grow vê, fora do menu do cliente.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Pronto"
          value={String(counts.pronto)}
          hint="Já usa. Produto só entra em plano se também for produto."
        />
        <KpiCard
          label="Validando"
          value={String(counts.validando)}
          hint="Tem tela. Ainda não passou no filtro."
          accent="neutral"
        />
        <KpiCard
          label="Rascunho"
          value={String(counts.rascunho)}
          hint="Conversamos. Ainda não tem tela."
          accent="neutral"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">
            Status
          </span>
          <Chip
            active={statusFilter === "todos"}
            onClick={() => setStatusFilter("todos")}
          >
            Todos
          </Chip>
          {STATUS_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={statusFilter === option.value}
              onClick={() => setStatusFilter(option.value as ResourceStatus)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">
            Onde
          </span>
          <Chip
            active={surfaceFilter === "todas"}
            onClick={() => setSurfaceFilter("todas")}
          >
            Todos
          </Chip>
          <Chip
            active={surfaceFilter === "hq"}
            onClick={() => setSurfaceFilter("hq")}
          >
            Land Grow
          </Chip>
          <Chip
            active={surfaceFilter === "cliente"}
            onClick={() => setSurfaceFilter("cliente")}
          >
            Cliente
          </Chip>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">
            Tipo
          </span>
          <Chip
            active={kindFilter === "todos"}
            onClick={() => setKindFilter("todos")}
          >
            Todos
          </Chip>
          <Chip
            active={kindFilter === "produto"}
            onClick={() => setKindFilter("produto")}
          >
            Produto
          </Chip>
          <Chip
            active={kindFilter === "interno"}
            onClick={() => setKindFilter("interno")}
          >
            Interno
          </Chip>
        </div>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-text-1">Nada neste filtro</p>
            <p className="mt-1 text-sm text-text-2">
              Solte um chip para ver o restante do inventário.
            </p>
          </CardContent>
        </Card>
      ) : (
        grouped.map((group) => (
          <AxisGroup
            key={group.axis}
            axis={group.axis}
            rows={group.rows}
            onStatus={setStatus}
          />
        ))
      )}
    </div>
  );
}

function AxisGroup({
  axis,
  rows,
  onStatus,
}: {
  axis: ResourceAxis;
  rows: PulsoResource[];
  onStatus: (id: string, status: ResourceStatus) => void;
}): JSX.Element {
  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
        {RESOURCE_AXIS_LABEL[axis]}
      </h2>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {rows.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-text-1">
                      {item.name}
                    </p>
                    <Badge variant={statusBadge(item.status)}>
                      {RESOURCE_STATUS_LABEL[item.status]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[11px] font-medium"
                    >
                      {item.kind === "produto" ? "Produto" : "Interno"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-2">{item.summary}</p>
                </div>
                <div className="space-y-1 text-xs text-text-2">
                  <p>
                    <span className="text-text-3">Onde · </span>
                    {surfaceLabel(item.surfaces)}
                  </p>
                  <p>
                    <span className="text-text-3">Acesso · </span>
                    {item.access}
                  </p>
                  <p>
                    <span className="text-text-3">Plano · </span>
                    {canEnterPlan(item)
                      ? "Candidato — passou no filtro"
                      : "Não entra ainda"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <MenuSelect
                    aria-label={`Status de ${item.name}`}
                    value={item.status}
                    onChange={(value) => {
                      if (isResourceStatus(value)) onStatus(item.id, value);
                    }}
                    options={STATUS_OPTIONS}
                    className="h-8 w-[9.5rem] rounded-md border border-border bg-surface-1 px-2 text-xs"
                  />
                  {item.href ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={item.href}>Abrir</Link>
                    </Button>
                  ) : (
                    <span className="text-[11px] text-text-3">Sem tela</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
