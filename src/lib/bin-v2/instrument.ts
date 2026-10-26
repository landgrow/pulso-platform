import industriaRaw from "@/data/bin-v2/industria.json";
import servicosRaw from "@/data/bin-v2/instrument.json";
import varejoRaw from "@/data/bin-v2/varejo.json";
import type { BinRoute } from "./route";
import type {
  BinInstrument,
  BinPackId,
  BinQuestion,
  BinSection,
} from "./types";

export const servicosInstrument = servicosRaw as BinInstrument;
export const varejoInstrument = varejoRaw as BinInstrument;
export const industriaInstrument = industriaRaw as BinInstrument;

export const BIN_INSTRUMENTS: Record<BinPackId, BinInstrument> = {
  servicos: servicosInstrument,
  varejo: varejoInstrument,
  industria: industriaInstrument,
};

/** Compat: o tronco e o formulário de serviços. */
export const binInstrument = servicosInstrument;

const indexes = new WeakMap<BinInstrument, Map<string, BinQuestion>>();

function resolveInstrument(instrument?: BinInstrument | null): BinInstrument {
  return instrument ?? binInstrument;
}

export function questionIndex(
  instrument?: BinInstrument | null,
): Map<string, BinQuestion> {
  const resolved = resolveInstrument(instrument);
  let map = indexes.get(resolved);
  if (!map) {
    map = new Map(resolved.questions.map((q) => [q.id, q] as const));
    indexes.set(resolved, map);
  }
  return map;
}

export function packIdFor(route: BinRoute | null | undefined): BinPackId {
  if (route === "varejo") return "varejo";
  if (route === "industria") return "industria";
  return "servicos";
}

export function instrumentFor(
  route: BinRoute | null | undefined,
): BinInstrument {
  return BIN_INSTRUMENTS[packIdFor(route)];
}

export function getBinQuestion(
  id: string,
  instrument?: BinInstrument | null,
): BinQuestion | undefined {
  return questionIndex(instrument).get(id);
}

export function requireBinQuestion(
  id: string,
  instrument?: BinInstrument | null,
): BinQuestion {
  const q = questionIndex(instrument).get(id);
  if (!q) throw new Error(`Questão BIN inexistente: ${id}`);
  return q;
}

export function getBinSection(
  id: string,
  instrument?: BinInstrument | null,
): BinSection | undefined {
  return resolveInstrument(instrument).sections.find((s) => s.id === id);
}

export function questionsInSection(
  section: BinSection,
  instrument?: BinInstrument | null,
): BinQuestion[] {
  const index = questionIndex(instrument);
  return section.questionIds
    .map((id) => index.get(id))
    .filter((q): q is BinQuestion => Boolean(q));
}
