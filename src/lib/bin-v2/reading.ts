import { evaluateBinGates } from "./gates";
import type { BinGatesReading } from "./gates";
import { evaluateBinLastro } from "./lastro";
import type { BinLastroFlag, BinSectorConfidence } from "./lastro";
import type { BinPack } from "./pack";
import { scoreBinSection } from "./score";
import type { BinSectionScore } from "./score";
import type { BinAnswers, BinSection } from "./types";
import { verifyBinAnswers } from "./verify";
import type { BinVerifyFlag } from "./verify";

export interface BinSectionReading {
  section: BinSection;
  score: BinSectionScore;
  submitted: boolean;
}

export interface BinReading {
  packId: BinPack["id"];
  completedSectionIds: string[];
  gates: BinGatesReading;
  flags: BinVerifyFlag[];
  lastro: BinLastroFlag[];
  confidence: BinSectorConfidence[];
  sections: BinSectionReading[];
}

export function completedBinSections(
  setoresEnviados: Record<string, string> | undefined,
  answers: BinAnswers,
  pack: BinPack,
): string[] {
  const fromFlow = Object.keys(setoresEnviados ?? {}).filter(
    (id) => id !== "geral",
  );
  if (fromFlow.length > 0) return fromFlow;
  return pack.instrument.sections
    .filter((section) => section.id !== "geral")
    .filter((section) => {
      const score = scoreBinSection(section, answers, pack.instrument);
      return score.status === "nota" || score.status === "nao_avaliavel";
    })
    .map((section) => section.id);
}

export function buildBinReading(
  answers: BinAnswers,
  pack: BinPack,
  setoresEnviados?: Record<string, string>,
): BinReading {
  const completedSectionIds = completedBinSections(
    setoresEnviados,
    answers,
    pack,
  );
  const completed = new Set(completedSectionIds);
  const sections: BinSectionReading[] = pack.instrument.sections.map(
    (section) => ({
      section,
      score: scoreBinSection(section, answers, pack.instrument),
      submitted: section.id === "geral" || completed.has(section.id),
    }),
  );
  const scored = sections.filter(
    (row) => row.section.id !== "geral" && row.submitted,
  );
  const gates = evaluateBinGates(answers, pack);
  const flags = verifyBinAnswers(answers, pack, [
    "geral",
    ...completedSectionIds,
  ]);
  const lastro = evaluateBinLastro(
    answers,
    pack,
    scored.map((row) => ({ section: row.section, score: row.score })),
  );

  return {
    packId: pack.id,
    completedSectionIds,
    gates,
    flags,
    lastro: lastro.flags,
    confidence: lastro.confidence,
    sections,
  };
}
