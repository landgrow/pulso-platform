import { isQuestionAnswered } from "./answers";
import { questionsInSection, resolveInstrument } from "./instrument-core";
import { isQuestionVisible } from "./visibility";
import type { BinAnswers, BinInstrument, BinSection } from "./types";

export function calcBinProgress(
  answers: BinAnswers,
  instrument?: BinInstrument | null,
): number {
  const inst = resolveInstrument(instrument);
  const visible = inst.questions.filter(
    (q) => q.required && isQuestionVisible(q, answers, inst),
  );
  if (visible.length === 0) return 100;
  const filled = visible.filter((q) => isQuestionAnswered(q, answers)).length;
  return Math.round((filled / visible.length) * 100);
}

export function binProgressFromPayload(
  payload: Record<string, unknown> | null | undefined,
  instrument?: BinInstrument | null,
): number {
  if (!payload) return 0;
  return calcBinProgress(payload as BinAnswers, instrument);
}

export function countBinSection(
  section: BinSection,
  answers: BinAnswers,
  instrument?: BinInstrument | null,
): { filled: number; total: number } {
  const inst = resolveInstrument(instrument);
  const questions = questionsInSection(section, inst).filter((q) =>
    isQuestionVisible(q, answers, inst),
  );
  return {
    total: questions.length,
    filled: questions.filter((q) => isQuestionAnswered(q, answers)).length,
  };
}
