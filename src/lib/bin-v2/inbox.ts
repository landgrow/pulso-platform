import { binProgressFromPayload } from "./progress";
import { readBinFlow } from "./flow";
import { binRouteLabel, type BinRoute } from "./route";
import type { BinAnswers } from "./types";
import type { BinEventKind } from "./flow";

export type BinInboxKind = BinEventKind | "rascunho";

export interface BinInboxRow {
  metadata: Record<string, unknown> | null;
  payload: unknown;
  updatedAt: string;
  orgName: string;
  orgSlug: string;
  isInternal: boolean;
  status?: string | null;
}

export interface BinInboxItem {
  at: string;
  kind: BinInboxKind;
  headline: string;
  orgName: string;
  orgSlug: string;
  href: string;
}

function fichaHref(slug: string): string {
  return `/admin/clientes/${slug}?tab=bin`;
}

function payloadOf(row: BinInboxRow): Partial<BinAnswers> {
  return row.payload && typeof row.payload === "object"
    ? (row.payload as Partial<BinAnswers>)
    : {};
}

function latestAt(
  values: Array<string | null | undefined>,
  fallback: string,
): string {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? fallback
  );
}

export function binInboxItemFromRow(row: BinInboxRow): BinInboxItem | null {
  const payload = payloadOf(row);
  const flow = readBinFlow(row.metadata ?? undefined);
  const route = (row.metadata?.route as BinRoute | undefined) ?? null;
  const routeBit = route ? ` · ${binRouteLabel(route)}` : "";
  const setorCount = Object.keys(flow.setoresEnviados).length;
  const href = fichaHref(row.orgSlug);
  const base = {
    orgName: row.orgName,
    orgSlug: row.orgSlug,
    href,
  };

  if (flow.diagnosticoEnviadoEm) {
    return {
      ...base,
      at: flow.diagnosticoEnviadoEm,
      kind: "diagnostico",
      headline: `BIN completo${routeBit}`,
    };
  }
  if (setorCount > 0) {
    return {
      ...base,
      at: latestAt(Object.values(flow.setoresEnviados), row.updatedAt),
      kind: "setor",
      headline:
        setorCount === 1
          ? `1 setor enviado${routeBit}`
          : `${setorCount} setores enviados${routeBit}`,
    };
  }
  if (flow.geralEnviadoEm) {
    return {
      ...base,
      at: flow.geralEnviadoEm,
      kind: "geral",
      headline: `Diagnóstico geral${routeBit}`,
    };
  }
  if (Object.keys(payload).length === 0) return null;
  return {
    ...base,
    at: row.updatedAt,
    kind: "rascunho",
    headline: `Preenchendo · ${binProgressFromPayload(payload)}%`,
  };
}

/** Um item por cliente — o diagnóstico vive na ficha, não como lista de envios. */
export function binInboxItemsFromRows(rows: BinInboxRow[]): BinInboxItem[] {
  const latestBySlug = new Map<string, BinInboxRow>();
  for (const row of rows) {
    if (row.isInternal) continue;
    if (row.status === "descartado") continue;
    const previous = latestBySlug.get(row.orgSlug);
    if (!previous || previous.updatedAt < row.updatedAt) {
      latestBySlug.set(row.orgSlug, row);
    }
  }

  const items: BinInboxItem[] = [];
  for (const row of latestBySlug.values()) {
    const item = binInboxItemFromRow(row);
    if (item) items.push(item);
  }
  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return items;
}
