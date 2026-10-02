import type {
  FormularioBloco,
  FormularioCampo,
} from "@/lib/formulario-questions";
import { questionsInSection } from "./instrument";
import type { BinQuestion, BinSection } from "./types";

function uiToCampoTipo(ui: BinQuestion["ui"]): FormularioCampo["tipo"] {
  if (ui === "textarea") return "textarea";
  if (ui === "checkbox") return "checkbox";
  return "radio";
}

export function binQuestionToCampo(question: BinQuestion): FormularioCampo {
  // Sem o código interno (G13, S02…) — é chave de schema, não texto de tela.
  // A numeração visível é feita no FormBlocoArea, depois de esconder as
  // perguntas condicionais, pra não pular número.
  const campo: FormularioCampo = {
    id: question.id,
    tipo: uiToCampoTipo(question.ui),
    label: question.prompt,
    required: question.required,
  };
  if (question.help) campo.help = question.help;
  if (question.options.length > 0) {
    campo.opcoes = question.options.map((o) => ({
      value: o.value,
      label: o.label,
      needsSpecify: o.needsSpecify,
    }));
  }
  return campo;
}

export function binSectionToBloco(section: BinSection): FormularioBloco {
  return {
    area: section.title,
    cor: section.color,
    perguntas: questionsInSection(section).map(binQuestionToCampo),
  };
}
