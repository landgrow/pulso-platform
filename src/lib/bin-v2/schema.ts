import { z } from "zod";
import { specifyKey, selectedNeedsSpecify } from "./answers";
import { binInstrument } from "./instrument";
import { isQuestionVisible } from "./visibility";
import type { BinAnswers, BinQuestion } from "./types";

function optionValues(question: BinQuestion): string[] {
  return question.options.map((o) => o.value);
}

function fieldSchema(question: BinQuestion): z.ZodTypeAny {
  if (question.ui === "textarea") {
    return z.string().trim().min(1, "Campo obrigatório");
  }
  const allowed = optionValues(question);
  if (question.ui === "checkbox") {
    return z
      .array(z.string())
      .min(1, "Marque pelo menos uma opção")
      .refine((vals) => vals.every((v) => allowed.includes(v)), {
        message: "Selecione uma das opções válidas",
      });
  }
  return z
    .string()
    .min(1, "Campo obrigatório")
    .refine((v) => allowed.includes(v), {
      message: "Selecione uma das opções válidas",
    });
}

/**
 * Valida só o que está visível. Autosave não usa este schema.
 * `filter` restringe ao geral ou ao formulário da categoria.
 */
export function parseBinAnswers(
  answers: BinAnswers,
  filter?: (question: BinQuestion) => boolean,
): {
  success: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  for (const question of binInstrument.questions) {
    if (filter && !filter(question)) continue;
    if (!question.required || !isQuestionVisible(question, answers)) continue;
    const parsed = fieldSchema(question).safeParse(answers[question.id]);
    if (!parsed.success) {
      errors[question.id] =
        parsed.error.issues[0]?.message ?? "Campo obrigatório";
      continue;
    }
    if (selectedNeedsSpecify(question, answers[question.id])) {
      const extra = z
        .string()
        .trim()
        .min(1, "Escreva qual")
        .safeParse(answers[specifyKey(question.id)]);
      if (!extra.success) {
        errors[specifyKey(question.id)] =
          extra.error.issues[0]?.message ?? "Escreva qual";
      }
    }
  }
  return { success: Object.keys(errors).length === 0, errors };
}

export function parseBinGeral(answers: BinAnswers): {
  success: boolean;
  errors: Record<string, string>;
} {
  return parseBinAnswers(answers, (q) => q.sectionId === "geral");
}

export function parseBinDirected(answers: BinAnswers): {
  success: boolean;
  errors: Record<string, string>;
} {
  return parseBinAnswers(answers, (q) => q.sectionId !== "geral");
}

export function parseBinSection(
  sectionId: string,
  answers: BinAnswers,
): {
  success: boolean;
  errors: Record<string, string>;
} {
  return parseBinAnswers(answers, (q) => q.sectionId === sectionId);
}
