import type { BinRoute } from "./route";
import type {
  BinInstrument,
  BinPackId,
  BinQuestion,
  BinSection,
} from "./types";

/**
 * Consultas ao questionário BIN SEM carregar os dados.
 *
 * Os questionários completos (pesos, notas das opções, gatilhos) só existem no
 * servidor (`instrument.ts`). O navegador recebe uma versão pública, sem esses
 * campos, e a registra aqui. Assim as telas usam as mesmas funções sem que o
 * método da Land Grow vá para o JavaScript público.
 */

let defaultInstrument: BinInstrument | null = null;

/** Questionário usado quando a função não recebe um explicitamente. */
export function setDefaultBinInstrument(instrument: BinInstrument): void {
  defaultInstrument = instrument;
}

export function resolveInstrument(
  instrument?: BinInstrument | null,
): BinInstrument {
  const resolved = instrument ?? defaultInstrument;
  if (!resolved) {
    throw new Error("Questionário BIN não carregado.");
  }
  return resolved;
}

const indexes = new WeakMap<BinInstrument, Map<string, BinQuestion>>();

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
