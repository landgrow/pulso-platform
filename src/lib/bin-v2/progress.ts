import { isQuestionAnswered } from "./answers";
import { binInstrument, questionsInSection } from "./instrument";
import { isQuestionVisible } from "./visibility";
import type { BinAnswers, BinSection } from "./types";

export function calcBinProgress(answers: BinAnswers): number {
  const visible = binInstrument.questions.filter(
    (q) => q.required && isQuestionVisible(q, answers),
  );
  if (visible.length === 0) return 100;
  const filled = visible.filter((q) => isQuestionAnswered(q, answers)).length;
  return Math.round((filled / visible.length) * 100);
}

export function binProgressFromPayload(
  payload: Record<string, unknown> | null | undefined,
): number {
  if (!payload) return 0;
  return calcBinProgress(payload as BinAnswers);
}

export function countBinSection(
  section: BinSection,
  answers: BinAnswers,
): { filled: number; total: number } {
  const questions = questionsInSection(section).filter((q) =>
    isQuestionVisible(q, answers),
  );
  return {
    total: questions.length,
    filled: questions.filter((q) => isQuestionAnswered(q, answers)).length,
  };
}
