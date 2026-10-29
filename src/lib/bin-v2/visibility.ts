import { specifyKey } from "./answers";
import { getBinQuestion, resolveInstrument } from "./instrument-core";
import type { BinAnswers, BinInstrument, BinQuestion } from "./types";

export function isQuestionVisible(
  question: BinQuestion,
  answers: BinAnswers,
  instrument?: BinInstrument | null,
): boolean {
  const rules = resolveInstrument(instrument).visibility;
  const rule = rules.find((r) => r.questionId === question.id);
  if (!rule) return true;
  return answers[rule.showWhen.questionId] === rule.showWhen.equals;
}

export function visibleQuestions(
  answers: BinAnswers,
  instrument?: BinInstrument | null,
): BinQuestion[] {
  const inst = resolveInstrument(instrument);
  return inst.questions.filter((q) => isQuestionVisible(q, answers, inst));
}

export function pruneHiddenAnswers(
  answers: BinAnswers,
  instrument?: BinInstrument | null,
): BinAnswers {
  const inst = resolveInstrument(instrument);
  const next: BinAnswers = { ...answers };
  for (const rule of inst.visibility) {
    const q = getBinQuestion(rule.questionId, inst);
    if (!q) continue;
    if (!isQuestionVisible(q, answers, inst)) {
      delete next[q.id];
      delete next[specifyKey(q.id)];
    }
  }
  return next;
}
