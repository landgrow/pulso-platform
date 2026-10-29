import "server-only";

import { getBinQuestion, questionsInSection } from "./instrument";
import { isQuestionVisible } from "./visibility";
import {
  type BinAnswerScore,
  type BinExcludedQuestion,
  type BinFaixa,
  type BinRefinementBlock,
  type BinSectionScore,
} from "./score-format";

export {
  BIN_FAIXA_COLORS,
  binFaixaColor,
  binFaixaTone,
  binSectionScoreLabel,
  formatBinNota,
} from "./score-format";
export type {
  BinAnswerScore,
  BinExcludedQuestion,
  BinFaixa,
  BinRefinementBlock,
  BinSectionScore,
} from "./score-format";
import type {
  BinAnswers,
  BinInstrument,
  BinOption,
  BinQuestion,
  BinSection,
} from "./types";

function emptyScore(extras?: Partial<BinSectionScore>): BinSectionScore {
  return {
    status: "sem_nota",
    nota: null,
    faixa: null,
    cobertura: null,
    notaBruta: null,
    tetoSetor: null,
    peso8Zeros: [],
    bloqueios: [],
    pesosAplicaveis: 0,
    pesosTotais: 0,
    foraDoCalculo: [],
    ...extras,
  };
}

function selectedOption(
  question: BinQuestion,
  answers: BinAnswers,
): BinOption | null {
  const value = answers[question.id];
  if (typeof value !== "string" || value.length === 0) return null;
  return question.options.find((option) => option.value === value) ?? null;
}

function scores(question: BinQuestion): boolean {
  return question.destinations.includes("pontua") && question.peso !== null;
}

function isExcluded(option: BinOption): boolean {
  return option.valorRelativo === null;
}

function faixaDe(nota: number): BinFaixa {
  if (nota <= 20) return "crítico";
  if (nota <= 40) return "ruim";
  if (nota <= 60) return "regular";
  if (nota <= 80) return "bom";
  return "excelente";
}

export function empresaAindaNaoComecou(answers: BinAnswers): boolean {
  return answers.G09 === "G09:1";
}

function declaredValor(
  question: BinQuestion,
  answers: BinAnswers,
): number | null {
  const option = selectedOption(question, answers);
  if (!option || isExcluded(option)) return null;
  return option.valorRelativo;
}

function valorFinal(
  question: BinQuestion,
  answers: BinAnswers,
  instrument?: BinInstrument,
): number | null {
  const declared = declaredValor(question, answers);
  if (declared === null) return null;
  const fundamentoId = question.fundamentoVinculado;
  if (question.layer !== "refinamento" || !fundamentoId) return declared;
  const fundamento = getBinQuestion(fundamentoId, instrument);
  if (!fundamento) return declared;
  const baseOption = selectedOption(fundamento, answers);
  if (baseOption && isExcluded(baseOption)) return null;
  const base = declaredValor(fundamento, answers);
  if (base === null) return declared;
  return Math.min(declared, base);
}

export function scoreBinAnswer(
  question: BinQuestion,
  answers: BinAnswers,
  instrument?: BinInstrument,
): BinAnswerScore {
  if (!scores(question)) {
    return { kind: "nao_pontua", valor: null, valorDeclarado: null };
  }
  const option = selectedOption(question, answers);
  if (!option) {
    return { kind: "sem_resposta", valor: null, valorDeclarado: null };
  }
  if (isExcluded(option)) {
    return { kind: "excluida", valor: null, valorDeclarado: null };
  }
  const declared = option.valorRelativo;
  const final = valorFinal(question, answers, instrument);
  if (final === null) {
    return { kind: "excluida", valor: null, valorDeclarado: declared };
  }
  return { kind: "pontos", valor: final, valorDeclarado: declared };
}

export function scoreBinSection(
  section: BinSection,
  answers: BinAnswers,
  instrument?: BinInstrument,
): BinSectionScore {
  const questions = questionsInSection(section, instrument).filter(
    (question) =>
      scores(question) && isQuestionVisible(question, answers, instrument),
  );
  if (questions.length === 0) return emptyScore();

  const pesosTotais = questions.reduce(
    (sum, question) => sum + (question.peso ?? 0),
    0,
  );
  if (pesosTotais === 0) return emptyScore();

  let incompleto = false;
  const aplicaveis: BinQuestion[] = [];
  const foraDoCalculo: BinExcludedQuestion[] = [];
  const bloqueios: BinRefinementBlock[] = [];

  for (const question of questions) {
    const option = selectedOption(question, answers);
    if (!option) {
      incompleto = true;
      continue;
    }
    if (isExcluded(option)) {
      foraDoCalculo.push({
        questionId: question.id,
        motivo: option.label,
      });
      continue;
    }
    const declared = option.valorRelativo;
    const final = valorFinal(question, answers, instrument);
    if (final === null) {
      foraDoCalculo.push({
        questionId: question.id,
        motivo: "fundamento excluído",
      });
      continue;
    }
    if (
      declared !== null &&
      question.layer === "refinamento" &&
      question.fundamentoVinculado &&
      final < declared
    ) {
      bloqueios.push({
        questionId: question.id,
        fundamentoId: question.fundamentoVinculado,
        declarado: declared,
        final,
      });
    }
    aplicaveis.push(question);
  }

  if (incompleto) {
    return emptyScore({
      status: "incompleto",
      pesosTotais,
      foraDoCalculo,
      bloqueios,
    });
  }

  const pesosAplicaveis = aplicaveis.reduce(
    (sum, question) => sum + (question.peso ?? 0),
    0,
  );
  if (pesosAplicaveis === 0 || pesosAplicaveis / pesosTotais < 0.6) {
    return emptyScore({
      status: "nao_avaliavel",
      cobertura: { existem: aplicaveis.length, total: questions.length },
      pesosAplicaveis,
      pesosTotais,
      foraDoCalculo,
      bloqueios,
    });
  }

  let bruta = 0;
  for (const question of aplicaveis) {
    const valor = valorFinal(question, answers, instrument);
    if (valor === null) continue;
    bruta += (valor / 100) * (question.peso ?? 0);
  }
  const notaBruta = (bruta / pesosAplicaveis) * 100;

  const peso8Zeros: string[] = [];
  for (const question of questions) {
    if (question.peso !== 8) continue;
    if (declaredValor(question, answers) === 0) peso8Zeros.push(question.id);
  }
  const tetoSetor =
    peso8Zeros.length >= 2 ? 20 : peso8Zeros.length === 1 ? 40 : 100;
  const nota = Math.round(Math.min(notaBruta, tetoSetor) * 10) / 10;
  const semOperacao = empresaAindaNaoComecou(answers);

  return {
    status: "nota",
    nota,
    faixa: semOperacao ? null : faixaDe(nota),
    cobertura: semOperacao
      ? { existem: aplicaveis.length, total: questions.length }
      : null,
    notaBruta: Math.round(notaBruta * 100) / 100,
    tetoSetor,
    peso8Zeros,
    bloqueios,
    pesosAplicaveis,
    pesosTotais,
    foraDoCalculo,
  };
}

export function binAnswerScoreLabel(
  question: BinQuestion,
  answers: BinAnswers,
  instrument?: BinInstrument,
): string | null {
  const score = scoreBinAnswer(question, answers, instrument);
  if (score.kind === "excluida") return "Fora da nota";
  if (score.kind !== "pontos" || score.valor === null) return null;
  if (score.valorDeclarado !== null && score.valorDeclarado !== score.valor) {
    return `${score.valorDeclarado} → ${score.valor} de 100`;
  }
  return `${score.valor} de 100`;
}
