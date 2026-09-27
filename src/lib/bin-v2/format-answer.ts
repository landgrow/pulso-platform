import { specifyKey } from "./answers";
import type { BinAnswers, BinAnswerValue, BinQuestion } from "./types";

function selectedValues(value: BinAnswerValue | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : value === "" ? [] : [value];
}

export function formatBinAnswer(
  question: BinQuestion,
  answers: BinAnswers,
): string | null {
  const value = answers[question.id];
  if (value === undefined) return null;
  if (question.ui === "textarea") {
    const text = typeof value === "string" ? value.trim() : "";
    return text.length > 0 ? text : null;
  }
  const labels = selectedValues(value).map((picked) => {
    const option = question.options.find((item) => item.value === picked);
    return option?.label ?? picked;
  });
  if (labels.length === 0) return null;
  const extra = answers[specifyKey(question.id)];
  if (typeof extra === "string" && extra.trim().length > 0) {
    return `${labels.join("; ")} — ${extra.trim()}`;
  }
  return labels.join("; ");
}
