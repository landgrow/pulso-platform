import { binEventHeadline, readBinFlow, type BinEventKind } from "./flow";
import { binProgressFromPayload } from "./progress";
import { getBinSection } from "./instrument";
import { binRouteLabel, type BinRoute } from "./route";
import type { BinAnswers } from "./types";

export type BinInboxKind = BinEventKind | "rascunho";

export interface BinInboxRow {
  metadata: Record<string, unknown> | null;
  payload: unknown;
  updatedAt: string;
  orgName: string;
  orgSlug: string;
  isInternal: boolean;
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
  return `/admin/clientes/${slug}#bin`;
}

export function binInboxItemsFromRows(rows: BinInboxRow[]): BinInboxItem[] {
  const items: BinInboxItem[] = [];
  for (const row of rows) {
    if (row.isInternal) continue;
    const payload =
      row.payload && typeof row.payload === "object"
        ? (row.payload as Partial<BinAnswers>)
        : {};
    const flow = readBinFlow(row.metadata ?? undefined);
    const route = (row.metadata?.route as BinRoute | undefined) ?? null;
    if (flow.events.length === 0) {
      const answered = Object.keys(payload).length;
      if (answered === 0) continue;
      items.push({
        at: row.updatedAt,
        kind: "rascunho",
        headline: `Está preenchendo o BIN · ${binProgressFromPayload(payload)}%`,
        orgName: row.orgName,
        orgSlug: row.orgSlug,
        href: fichaHref(row.orgSlug),
      });
      continue;
    }
    for (const event of flow.events) {
      const section = event.sectionId
        ? getBinSection(event.sectionId)
        : undefined;
      items.push({
        at: event.at,
        kind: event.kind,
        headline: binEventHeadline({
          kind: event.kind,
          routeLabel: binRouteLabel(event.route ?? route),
          ...(section ? { sectionTitle: section.title } : {}),
        }),
        orgName: row.orgName,
        orgSlug: row.orgSlug,
        href: fichaHref(row.orgSlug),
      });
    }
  }
  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return items.slice(0, 40);
}
