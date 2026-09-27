import { specifyKey } from "./answers";
import { binInstrument, getBinQuestion } from "./instrument";
import type { BinAnswers, BinQuestion } from "./types";

export function isQuestionVisible(
  question: BinQuestion,
  answers: BinAnswers,
): boolean {
  const rule = binInstrument.visibility.find(
    (r) => r.questionId === question.id,
  );
  if (!rule) return true;
  return answers[rule.showWhen.questionId] === rule.showWhen.equals;
}

export function visibleQuestions(answers: BinAnswers): BinQuestion[] {
  return binInstrument.questions.filter((q) => isQuestionVisible(q, answers));
}

export function pruneHiddenAnswers(answers: BinAnswers): BinAnswers {
  const next: BinAnswers = { ...answers };
  for (const rule of binInstrument.visibility) {
    const q = getBinQuestion(rule.questionId);
    if (!q) continue;
    if (!isQuestionVisible(q, answers)) {
      delete next[q.id];
      delete next[specifyKey(q.id)];
    }
  }
  return next;
}
