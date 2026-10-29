import "server-only";

import { BIN_INSTRUMENTS } from "./instrument";
import type { BinInstrument, BinPackId, BinQuestion } from "./types";

/**
 * Versão do questionário que pode ir para o navegador: só o necessário para
 * mostrar e validar as perguntas. Ficam no servidor o método da Land Grow —
 * peso de cada pergunta, nota de cada opção (`valorRelativo`), observações,
 * destinos, camadas e fundamentos vinculados — e as notas internas do arquivo.
 */
function publicQuestion(question: BinQuestion): BinQuestion {
  return {
    id: question.id,
    sectionId: question.sectionId,
    prompt: question.prompt,
    help: question.help,
    scale: question.scale,
    ui: question.ui,
    layer: null,
    destinations: [],
    composedWith: null,
    peso: null,
    fundamentoVinculado: null,
    required: question.required,
    options: question.options.map((option) => ({
      value: option.value,
      label: option.label,
      needsSpecify: option.needsSpecify,
      valorRelativo: null,
      observacao: null,
    })),
  };
}

export function toPublicInstrument(instrument: BinInstrument): BinInstrument {
  return {
    instrument: instrument.instrument,
    title: instrument.title,
    generatedAt: "",
    notes: [],
    visibility: instrument.visibility,
    sections: instrument.sections,
    questions: instrument.questions.map(publicQuestion),
  };
}

const cache = new Map<BinPackId, BinInstrument>();

/** Os três questionários públicos (a categoria pode mudar enquanto o geral é respondido). */
export function publicBinInstruments(): Record<BinPackId, BinInstrument> {
  const ids: BinPackId[] = ["servicos", "varejo", "industria"];
  const out = {} as Record<BinPackId, BinInstrument>;
  for (const id of ids) {
    let pub = cache.get(id);
    if (!pub) {
      pub = toPublicInstrument(BIN_INSTRUMENTS[id]);
      cache.set(id, pub);
    }
    out[id] = pub;
  }
  return out;
}
