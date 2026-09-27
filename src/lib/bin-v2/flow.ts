import type { BinRoute } from "./route";

export type BinEventKind = "geral" | "setor" | "diagnostico";

export interface BinStaffEvent {
  at: string;
  kind: BinEventKind;
  sectionId?: string;
  route?: BinRoute | null;
}

export interface BinFlowMeta {
  geralEnviadoEm: string | null;
  diagnosticoEnviadoEm: string | null;
  setoresEnviados: Record<string, string>;
  events: BinStaffEvent[];
}

const MAX_EVENTS = 40;

function asIso(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asRoute(value: unknown): BinRoute | null {
  if (
    value === "servicos" ||
    value === "varejo" ||
    value === "industria" ||
    value === "pre_operacao"
  ) {
    return value;
  }
  return null;
}

function asKind(value: unknown): BinEventKind | null {
  if (value === "geral" || value === "setor" || value === "diagnostico") {
    return value;
  }
  return null;
}

export function emptyBinFlow(): BinFlowMeta {
  return {
    geralEnviadoEm: null,
    diagnosticoEnviadoEm: null,
    setoresEnviados: {},
    events: [],
  };
}

export function readBinFlow(
  meta: Record<string, unknown> | undefined,
): BinFlowMeta {
  const setoresRaw = meta?.setoresEnviados;
  const setoresEnviados: Record<string, string> = {};
  if (setoresRaw && typeof setoresRaw === "object") {
    for (const [key, value] of Object.entries(
      setoresRaw as Record<string, unknown>,
    )) {
      const iso = asIso(value);
      if (iso) setoresEnviados[key] = iso;
    }
  }

  const events: BinStaffEvent[] = [];
  if (Array.isArray(meta?.events)) {
    for (const raw of meta.events) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      const kind = asKind(row.kind);
      const at = asIso(row.at);
      if (!kind || !at) continue;
      events.push({
        at,
        kind,
        ...(typeof row.sectionId === "string"
          ? { sectionId: row.sectionId }
          : {}),
        route: asRoute(row.route),
      });
    }
  }

  const flow: BinFlowMeta = {
    geralEnviadoEm: asIso(meta?.geralEnviadoEm),
    diagnosticoEnviadoEm: asIso(meta?.diagnosticoEnviadoEm),
    setoresEnviados,
    events,
  };

  if (flow.events.length === 0 && flow.geralEnviadoEm) {
    flow.events.push({
      at: flow.geralEnviadoEm,
      kind: "geral",
      sectionId: "geral",
      route: asRoute(meta?.route),
    });
  }
  if (flow.events.length > 0 && flow.diagnosticoEnviadoEm) {
    const already = flow.events.some((event) => event.kind === "diagnostico");
    if (!already) {
      flow.events.push({
        at: flow.diagnosticoEnviadoEm,
        kind: "diagnostico",
        route: asRoute(meta?.route),
      });
    }
  }

  return flow;
}

export function appendBinEvent(
  flow: BinFlowMeta,
  event: BinStaffEvent,
): BinFlowMeta {
  const next: BinFlowMeta = {
    ...flow,
    setoresEnviados: { ...flow.setoresEnviados },
    events: [...flow.events, event].slice(-MAX_EVENTS),
  };
  if (event.kind === "geral") {
    next.geralEnviadoEm = event.at;
  }
  if (event.kind === "diagnostico") {
    next.diagnosticoEnviadoEm = event.at;
  }
  if (event.kind === "setor" && event.sectionId) {
    next.setoresEnviados[event.sectionId] = event.at;
  }
  return next;
}

export function binEventHeadline(event: {
  kind: BinEventKind;
  sectionTitle?: string;
  routeLabel: string;
}): string {
  if (event.kind === "geral") {
    return `Enviou o diagnóstico geral · ${event.routeLabel}`;
  }
  if (event.kind === "setor") {
    return `Concluiu o setor ${event.sectionTitle ?? "do BIN"}`;
  }
  return `Enviou o BIN completo · ${event.routeLabel}`;
}
