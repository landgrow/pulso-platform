import "server-only";

import gatilhosIndustria from "@/data/bin-v2/gatilhos-industria.json";
import gatilhosServicos from "@/data/bin-v2/gatilhos-servicos.json";
import gatilhosVarejo from "@/data/bin-v2/gatilhos-varejo.json";
import type { BinPackId } from "./types";

export type BinFlagClass = "F" | "I" | "D" | "P";

export interface BinTriggerRule {
  regra: string;
  classe: string;
  questaoA: string;
  disparaA: string[];
  disparaARaw: string;
  questaoB: string;
  disparaB: string[];
  disparaBRaw: string;
  precedencia: string | null;
  acao: string;
}

export interface BinGateTrigger {
  questionId: string;
  labels: string[];
  secondary?: boolean;
}

export interface BinGateCatalog {
  portao1: BinGateTrigger[];
  naoGera: BinGateTrigger;
  folegoCurto: BinGateTrigger;
  autoavaliacao: string[];
}

export const BIN_GATILHOS: Record<BinPackId, BinTriggerRule[]> = {
  servicos: gatilhosServicos as BinTriggerRule[],
  varejo: gatilhosVarejo as BinTriggerRule[],
  industria: gatilhosIndustria as BinTriggerRule[],
};

export const BIN_GATE_CATALOGS: Record<BinPackId, BinGateCatalog> = {
  servicos: {
    portao1: [
      {
        questionId: "R07",
        labels: ["Nenhuma, trabalhamos sem ter", "Só uma pessoa"],
      },
      {
        questionId: "J02",
        labels: [
          "Não sei quais são exigidos para a minha atividade",
          "Sei quais são e não temos",
        ],
      },
      {
        questionId: "J03",
        labels: [
          "Sim, já existe bloqueio ou penhora em curso",
          "Sim, existe processo ou cobrança judicial andando",
        ],
      },
      {
        questionId: "V16",
        labels: [
          "A empresa não se sustentaria",
          "O faturamento cairia mais ou menos pela metade",
        ],
      },
      {
        questionId: "J04",
        labels: ["Sei que tem coisa irregular"],
        secondary: true,
      },
    ],
    naoGera: {
      questionId: "F11",
      labels: [
        "Faltou e precisei de empréstimo, cheque especial ou cartão",
        "Faltou e usei reserva ou dinheiro do meu bolso",
        "Ficou zerado, entrou e saiu tudo",
      ],
    },
    folegoCurto: {
      questionId: "F12",
      labels: [
        "Menos de um mês, dependo do que entra todo mês",
        "De um a dois meses",
      ],
    },
    autoavaliacao: ["O05", "O16", "M09"],
  },
  varejo: {
    portao1: [
      {
        questionId: "O11",
        labels: [
          "A empresa pararia, não teria como repor",
          "Boa parte das prateleiras ficaria vazia",
        ],
      },
      {
        questionId: "J02",
        labels: [
          "Não sei quais são exigidos para a minha atividade",
          "Sei quais são e não temos",
        ],
      },
      {
        questionId: "J05",
        labels: [
          "Sim, já existe bloqueio ou penhora em curso",
          "Sim, existe processo ou cobrança judicial andando",
        ],
      },
      {
        questionId: "V16",
        labels: [
          "A empresa não se sustentaria",
          "O faturamento cairia mais ou menos pela metade",
        ],
      },
      {
        questionId: "J03",
        labels: [
          "Sei que tem coisa irregular",
          "Está regular para uma parte das pessoas",
        ],
        secondary: true,
      },
    ],
    naoGera: {
      questionId: "F15",
      labels: [
        "Faltou e precisei de empréstimo, cheque especial ou cartão",
        "Faltou e usei reserva ou dinheiro do meu bolso",
        "Ficou zerado, entrou e saiu tudo",
      ],
    },
    folegoCurto: {
      questionId: "F17",
      labels: [
        "Menos de um mês, dependo do que entra todo dia",
        "De um a dois meses",
      ],
    },
    autoavaliacao: ["O04", "O06", "O19", "M08"],
  },
  industria: {
    portao1: [
      {
        questionId: "O07",
        labels: [
          "Sim, e se essa pessoa faltar a produção para",
          "Sim, e a gente se vira com dificuldade",
        ],
      },
      {
        questionId: "O08",
        labels: ["A produção para inteira", "Boa parte da produção para"],
      },
      {
        questionId: "O25",
        labels: [
          "A produção pararia, não existe substituto",
          "Boa parte da produção pararia",
        ],
      },
      { questionId: "R12", labels: ["Sim, com afastamento"] },
      {
        questionId: "J02",
        labels: [
          "Não sei quais são exigidos para a minha atividade",
          "Sei quais são e não temos",
        ],
      },
      {
        questionId: "J03",
        labels: [
          "Não sei se a nossa atividade precisa",
          "Sei que precisa e não temos",
        ],
      },
      {
        questionId: "J08",
        labels: [
          "Sim, já existe bloqueio ou penhora em curso",
          "Sim, existe processo ou cobrança judicial andando",
        ],
      },
      {
        questionId: "V15",
        labels: [
          "Sim, a maior parte iria com ele",
          "Uma parte importante iria com ele",
        ],
      },
      {
        questionId: "V19",
        labels: [
          "A empresa não se sustentaria",
          "O faturamento cairia mais ou menos pela metade",
        ],
      },
      {
        questionId: "J05",
        labels: [
          "Sei que tem coisa irregular",
          "Está regular para uma parte das pessoas",
        ],
        secondary: true,
      },
    ],
    naoGera: {
      questionId: "F20",
      labels: [
        "Faltou e precisei de empréstimo, cheque especial ou cartão",
        "Faltou e usei reserva ou dinheiro do meu bolso",
        "Ficou zerado, entrou e saiu tudo",
      ],
    },
    folegoCurto: {
      questionId: "F22",
      labels: [
        "Menos de um mês, dependo do que entra todo mês",
        "De um a dois meses",
      ],
    },
    autoavaliacao: ["O01", "O03", "O15", "O17", "R12", "M08"],
  },
};
