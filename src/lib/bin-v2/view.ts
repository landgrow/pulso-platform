import "server-only";

import { buildBinDeliverables, type BinDeliverableSet } from "./deliverables";
import type { BinFlowMeta } from "./flow";
import { getBinQuestion } from "./instrument";
import { packFor } from "./pack";
import { countBinSection } from "./progress";
import { buildBinReading, type BinReading } from "./reading";
import type { BinRoute } from "./route";
import {
  binAnswerScoreLabel,
  binSectionScoreLabel,
  scoreBinSection,
  type BinSectionScore,
} from "./score";
import type { BinAnswers, BinSection } from "./types";
import { isQuestionVisible } from "./visibility";

/**
 * Leitura do BIN já calculada no servidor, no formato que as telas desenham.
 * O navegador recebe o resultado (notas, faixas, portões, entregáveis), nunca
 * os pesos, gatilhos ou as regras que produziram esse resultado.
 */

export interface BinSectorRow {
  section: BinSection;
  index: number;
  filled: number;
  total: number;
  scoreLabel: string | null;
  faixa: string | null;
}

export interface BinReadingView {
  reading: BinReading;
  sets: BinDeliverableSet[];
  sectors: BinSectorRow[];
  /** Só para a equipe: rótulo da pontuação de cada pergunta respondida. */
  answerScores?: Record<string, string | null>;
}

function publicScore(score: BinSectionScore): BinSectionScore {
  return {
    status: score.status,
    nota: score.nota,
    faixa: score.faixa,
    cobertura: score.cobertura,
    notaBruta: score.notaBruta,
    tetoSetor: score.tetoSetor,
    peso8Zeros: [],
    bloqueios: [],
    pesosAplicaveis: 0,
    pesosTotais: 0,
    foraDoCalculo: [],
  };
}

function publicReading(reading: BinReading): BinReading {
  return {
    packId: reading.packId,
    completedSectionIds: reading.completedSectionIds,
    gates: reading.gates,
    // A tela mostra regra, classe e resumo; ação e precedência são do método.
    flags: reading.flags.map((flag) => ({
      ...flag,
      precedencia: null,
      acao: "",
    })),
    lastro: [],
    confidence: [],
    sections: reading.sections.map((row) => ({
      section: row.section,
      score: publicScore(row.score),
      submitted: row.submitted,
    })),
  };
}

export function buildBinReadingView(
  answers: BinAnswers,
  route: BinRoute | null,
  flow: BinFlowMeta,
  opts: { staff?: boolean } = {},
): BinReadingView {
  const pack = packFor(route);
  const reading = buildBinReading(answers, pack, flow.setoresEnviados);
  const sets = buildBinDeliverables(answers, pack, reading);

  const sectors: BinSectorRow[] = pack.instrument.sections.map(
    (section, index) => {
      const { filled, total } = countBinSection(
        section,
        answers,
        pack.instrument,
      );
      const score = scoreBinSection(section, answers, pack.instrument);
      return {
        section,
        index,
        filled,
        total,
        scoreLabel: binSectionScoreLabel(score),
        faixa: score.faixa,
      };
    },
  );

  const view: BinReadingView = {
    reading: publicReading(reading),
    sets,
    sectors,
  };

  if (opts.staff) {
    const answerScores: Record<string, string | null> = {};
    for (const section of pack.instrument.sections) {
      for (const id of section.questionIds) {
        const question = getBinQuestion(id, pack.instrument);
        if (!question || !isQuestionVisible(question, answers, pack.instrument))
          continue;
        answerScores[id] = binAnswerScoreLabel(
          question,
          answers,
          pack.instrument,
        );
      }
    }
    view.answerScores = answerScores;
  }

  return view;
}
