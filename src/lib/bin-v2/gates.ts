import "server-only";

import { isQuestionAnswered, selectedLabels } from "./answers";
import type { BinGateTrigger } from "./catalog";
import { getBinQuestion } from "./instrument";
import type { BinPack } from "./pack";
import { labelMatches } from "./text";
import type { BinAnswers, BinInstrument, BinQuestion } from "./types";

export type BinGateStatus =
  | "disparado"
  | "nao_disparado"
  | "nao_gera"
  | "folego_curto"
  | "gera"
  | "avaliado"
  | "subordinado"
  | "aguardando";

export interface BinGateHit {
  questionId: string;
  label: string;
  secondary: boolean;
}

export interface BinGateResult {
  id: "portao_1" | "portao_2" | "portao_3";
  nome: string;
  status: BinGateStatus;
  hits: BinGateHit[];
  faltando: string[];
  resumo: string;
}

export interface BinGatesReading {
  portao1: BinGateResult;
  portao2: BinGateResult;
  portao3: BinGateResult;
  bloqueiaEstrutura: boolean;
}

function matchTrigger(
  trigger: BinGateTrigger,
  answers: BinAnswers,
  instrument: BinInstrument,
): {
  question: BinQuestion | undefined;
  answered: boolean;
  hits: BinGateHit[];
} {
  const question = getBinQuestion(trigger.questionId, instrument);
  if (!question) {
    return { question, answered: false, hits: [] };
  }
  if (!isQuestionAnswered(question, answers)) {
    return { question, answered: false, hits: [] };
  }
  const labels = selectedLabels(question, answers);
  const hits = labels
    .filter((label) => labelMatches(label, trigger.labels))
    .map((label) => ({
      questionId: trigger.questionId,
      label,
      secondary: Boolean(trigger.secondary),
    }));
  return { question, answered: true, hits };
}

function hitLine(hit: BinGateHit): string {
  return `${hit.questionId}: ${hit.label}`;
}

export function evaluateBinGates(
  answers: BinAnswers,
  pack: BinPack,
): BinGatesReading {
  const instrument = pack.instrument;
  const catalog = pack.gates;

  const p1Hits: BinGateHit[] = [];
  const p1Missing: string[] = [];
  let p1Answered = 0;
  for (const trigger of catalog.portao1) {
    const result = matchTrigger(trigger, answers, instrument);
    if (!result.answered) {
      p1Missing.push(trigger.questionId);
      continue;
    }
    p1Answered += 1;
    p1Hits.push(...result.hits);
  }

  let portao1: BinGateResult;
  if (p1Hits.length > 0) {
    portao1 = {
      id: "portao_1",
      nome: "Continuidade",
      status: "disparado",
      hits: p1Hits,
      faltando: p1Missing,
      resumo: `Há algo que pode parar a operação nos próximos 90 dias. ${p1Hits.map(hitLine).join("; ")}. A leitura setorial fica subordinada a este achado.`,
    };
  } else if (p1Answered === 0) {
    portao1 = {
      id: "portao_1",
      nome: "Continuidade",
      status: "aguardando",
      hits: [],
      faltando: p1Missing,
      resumo:
        "Ainda não deu para avaliar continuidade. Faltam as perguntas de risco dos setores que alimentam este portão.",
    };
  } else {
    portao1 = {
      id: "portao_1",
      nome: "Continuidade",
      status: "nao_disparado",
      hits: [],
      faltando: p1Missing,
      resumo:
        p1Missing.length > 0
          ? `Nada disparou nas perguntas já respondidas. Ainda falta ${p1Missing.join(", ")}.`
          : "Nada nas respostas indica parada da operação nos próximos 90 dias.",
    };
  }

  const naoGera = matchTrigger(catalog.naoGera, answers, instrument);
  const curto = matchTrigger(catalog.folegoCurto, answers, instrument);
  const p2Missing: string[] = [];
  if (!naoGera.answered) p2Missing.push(catalog.naoGera.questionId);
  if (!curto.answered) p2Missing.push(catalog.folegoCurto.questionId);
  const p2Hits = [...naoGera.hits, ...curto.hits];

  let portao2: BinGateResult;
  if (naoGera.hits.length > 0) {
    portao2 = {
      id: "portao_2",
      nome: "Fôlego",
      status: "nao_gera",
      hits: p2Hits,
      faltando: p2Missing,
      resumo: `A empresa não gera recurso suficiente para financiar a própria correção. ${naoGera.hits.map(hitLine).join("; ")}. A primeira intervenção precisa produzir ou liberar caixa antes de qualquer coisa que custe.`,
    };
  } else if (curto.hits.length > 0) {
    portao2 = {
      id: "portao_2",
      nome: "Fôlego",
      status: "folego_curto",
      hits: p2Hits,
      faltando: p2Missing,
      resumo: `O fôlego de caixa é curto. ${curto.hits.map(hitLine).join("; ")}. Qualquer ação estrutural precisa caber nesse horizonte.`,
    };
  } else if (!naoGera.answered && !curto.answered) {
    portao2 = {
      id: "portao_2",
      nome: "Fôlego",
      status: "aguardando",
      hits: [],
      faltando: p2Missing,
      resumo:
        "Ainda não deu para avaliar fôlego. Responda o financeiro para este portão fechar.",
    };
  } else {
    portao2 = {
      id: "portao_2",
      nome: "Fôlego",
      status: "gera",
      hits: [],
      faltando: p2Missing,
      resumo:
        p2Missing.length > 0
          ? `Pelo que já foi respondido, a empresa gera caixa. Ainda falta ${p2Missing.join(", ")}.`
          : "A empresa gera recurso suficiente para financiar a correção.",
    };
  }

  const bloqueiaEstrutura =
    portao1.status === "disparado" ||
    portao2.status === "nao_gera" ||
    portao2.status === "folego_curto";

  const portao3: BinGateResult = bloqueiaEstrutura
    ? {
        id: "portao_3",
        nome: "Estrutura",
        status: "subordinado",
        hits: [],
        faltando: [],
        resumo: `A leitura estrutural fica subordinada ao ${portao1.status === "disparado" ? "portão 1 (continuidade)" : "portão 2 (fôlego)"}. As notas setoriais existem, mas não abrem o relatório.`,
      }
    : {
        id: "portao_3",
        nome: "Estrutura",
        status: "avaliado",
        hits: [],
        faltando: [],
        resumo:
          "Nenhum portão superior bloqueia. A prioridade de ação segue a leitura setorial.",
      };

  return { portao1, portao2, portao3, bloqueiaEstrutura };
}
