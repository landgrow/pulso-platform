import "server-only";

import { BIN_INSTRUMENTS, servicosInstrument } from "./instrument";
import {
  resolveShareSectionAmong,
  shareSectionsOf,
  type BinShareSection,
} from "./share-core";

export { binSharePath, binShareUrl } from "./share-core";
export type { BinShareSection } from "./share-core";

const ALL_INSTRUMENTS = [servicosInstrument, ...Object.values(BIN_INSTRUMENTS)];
const SECTION_IDS = new Set(
  shareSectionsOf(ALL_INSTRUMENTS).map((section) => section.id),
);

export function isBinShareSection(sectionId: string): boolean {
  return SECTION_IDS.has(sectionId);
}

export function resolveBinShareSection(
  sectionId: string | null | undefined,
  geralEnviadoEm: string | null | undefined,
): string | null {
  return resolveShareSectionAmong(SECTION_IDS, sectionId, geralEnviadoEm);
}

export function binShareSections(): BinShareSection[] {
  return shareSectionsOf(ALL_INSTRUMENTS);
}
