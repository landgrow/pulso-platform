import { BIN_SPECIFY_SUFFIX } from "./types";
import type { BinAnswers, BinAnswerValue, BinQuestion } from "./types";

export function specifyKey(questionId: string): string {
  return `${questionId}${BIN_SPECIFY_SUFFIX}`;
}

export function isSpecifyKey(key: string): boolean {
  return key.endsWith(BIN_SPECIFY_SUFFIX);
}

function selectedValues(value: BinAnswerValue | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : value === "" ? [] : [value];
}

export function selectedNeedsSpecify(
  question: BinQuestion,
  value: BinAnswerValue | undefined,
): boolean {
  const picked = new Set(selectedValues(value));
  return question.options.some((o) => o.needsSpecify && picked.has(o.value));
}

export function isQuestionAnswered(
  question: BinQuestion,
  answers: BinAnswers,
): boolean {
  const value = answers[question.id];
  if (question.ui === "textarea") {
    return typeof value === "string" && value.trim().length > 0;
  }
  if (question.ui === "checkbox") {
    if (!Array.isArray(value) || value.length === 0) return false;
  } else if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  if (!selectedNeedsSpecify(question, value)) return true;
  const extra = answers[specifyKey(question.id)];
  return typeof extra === "string" && extra.trim().length > 0;
}
