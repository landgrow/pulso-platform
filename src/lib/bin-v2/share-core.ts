import type { BinInstrument } from "./types";

/** Links de setor do BIN — sem dados do questionário (seguro para telas). */

export function binSharePath(slug: string, sectionId: string): string {
  return `/clientes/${slug}/bin?setor=${encodeURIComponent(sectionId)}`;
}

export function binShareUrl(
  origin: string,
  slug: string,
  sectionId: string,
): string {
  return `${origin.replace(/\/$/, "")}${binSharePath(slug, sectionId)}`;
}

export interface BinShareSection {
  id: string;
  title: string;
}

/** Setores (sem repetir) dos questionários informados, na ordem em que aparecem. */
export function shareSectionsOf(
  instruments: readonly BinInstrument[],
): BinShareSection[] {
  const seen = new Set<string>();
  const sections: BinShareSection[] = [];
  for (const instrument of instruments) {
    for (const section of instrument.sections) {
      if (seen.has(section.id)) continue;
      seen.add(section.id);
      sections.push({ id: section.id, title: section.title });
    }
  }
  return sections;
}

/** Setor pedido no link, se existir; setores só depois do geral enviado. */
export function resolveShareSectionAmong(
  validIds: ReadonlySet<string>,
  sectionId: string | null | undefined,
  geralEnviadoEm: string | null | undefined,
): string | null {
  if (!sectionId || !validIds.has(sectionId)) return null;
  if (sectionId === "geral") return "geral";
  if (!geralEnviadoEm) return null;
  return sectionId;
}
