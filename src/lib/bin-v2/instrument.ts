import raw from "@/data/bin-v2/instrument.json";
import type { BinInstrument, BinQuestion, BinSection } from "./types";
import { BIN_V2_INSTRUMENT } from "./types";

export const binInstrument = raw as BinInstrument;

if (binInstrument.instrument !== BIN_V2_INSTRUMENT) {
  throw new Error(`Instrumento inesperado: ${binInstrument.instrument}`);
}

const questionsById = new Map(
  binInstrument.questions.map((q) => [q.id, q] as const),
);

export function getBinQuestion(id: string): BinQuestion | undefined {
  return questionsById.get(id);
}

export function requireBinQuestion(id: string): BinQuestion {
  const q = questionsById.get(id);
  if (!q) throw new Error(`Questão BIN v2 inexistente: ${id}`);
  return q;
}

export function getBinSection(id: string): BinSection | undefined {
  return binInstrument.sections.find((s) => s.id === id);
}

export function questionsInSection(section: BinSection): BinQuestion[] {
  return section.questionIds
    .map((id) => questionsById.get(id))
    .filter((q): q is BinQuestion => Boolean(q));
}
