import { selectedOptions } from "./answers";
import { getBinQuestion, questionsInSection } from "./instrument";
import type { BinPack } from "./pack";
import type { BinSectionScore } from "./score";
import type { BinAnswers, BinSection } from "./types";

export type BinConfidence = "normal" | "reduzida";

export interface BinLastroFlag {
  id: "9A" | "9C" | "banda";
  setorId: string | null;
  resumo: string;
}

export interface BinSectorConfidence {
  sectionId: string;
  confidence: BinConfidence;
  motivo: string | null;
}

function autoavaliacaoShare(section: BinSection, pack: BinPack): number {
  const questions = questionsInSection(section, pack.instrument).filter((q) =>
    q.destinations.includes("pontua"),
  );
  const total = questions.reduce((sum, q) => sum + (q.peso ?? 0), 0);
  if (total === 0) return 0;
  const auto = questions
    .filter((q) => pack.gates.autoavaliacao.includes(q.id))
    .reduce((sum, q) => sum + (q.peso ?? 0), 0);
  return auto / total;
}

function peso8NoTopo(
  section: BinSection,
  answers: BinAnswers,
  pack: BinPack,
): boolean {
  const questions = questionsInSection(section, pack.instrument).filter(
    (q) => q.peso === 8 && q.destinations.includes("pontua"),
  );
  return questions.some((question) => {
    const option = selectedOptions(question, answers)[0];
    return option?.valorRelativo === 100;
  });
}

export function openingConfidence(
  section: BinSection,
  answers: BinAnswers,
  pack: BinPack,
): BinSectorConfidence {
  const openingId = `${section.prefix}00`;
  const question = getBinQuestion(openingId, pack.instrument);
  if (!question) {
    return { sectionId: section.id, confidence: "normal", motivo: null };
  }
  const option = selectedOptions(question, answers)[0];
  if (!option) {
    return { sectionId: section.id, confidence: "normal", motivo: null };
  }
  const reduced =
    option.observacao?.toLowerCase().includes("banda reduzida") ||
    option.value.endsWith(":4") ||
    option.value.endsWith(":5");
  if (!reduced) {
    return { sectionId: section.id, confidence: "normal", motivo: null };
  }
  return {
    sectionId: section.id,
    confidence: "reduzida",
    motivo: `${openingId}: ${option.label}`,
  };
}

export function evaluateBinLastro(
  answers: BinAnswers,
  pack: BinPack,
  scores: { section: BinSection; score: BinSectionScore }[],
): { flags: BinLastroFlag[]; confidence: BinSectorConfidence[] } {
  const flags: BinLastroFlag[] = [];
  const confidence = scores
    .filter((row) => row.section.id !== "geral")
    .map((row) => openingConfidence(row.section, answers, pack));

  for (const row of scores) {
    if (row.score.status !== "nota" || row.score.nota === null) continue;
    if (row.score.nota <= 70) continue;
    if (peso8NoTopo(row.section, answers, pack)) continue;
    flags.push({
      id: "9A",
      setorId: row.section.id,
      resumo: `${row.section.title} saiu ${row.score.nota} sem nenhuma questão de peso 8 no topo. Nota alta só por degraus intermediários.`,
    });
  }

  const ranked = scores
    .filter(
      (row) =>
        row.section.id !== "geral" &&
        row.score.status === "nota" &&
        row.score.nota !== null,
    )
    .sort((a, b) => (b.score.nota ?? 0) - (a.score.nota ?? 0));

  if (ranked.length >= 2) {
    const top = ranked.slice(0, 2);
    const shares = scores
      .filter((row) => row.section.id !== "geral")
      .map((row) => ({
        id: row.section.id,
        share: autoavaliacaoShare(row.section, pack),
      }))
      .sort((a, b) => b.share - a.share);
    const autoIds = new Set(shares.slice(0, 2).map((row) => row.id));
    if (top.every((row) => autoIds.has(row.section.id))) {
      flags.push({
        id: "9C",
        setorId: null,
        resumo: `As duas maiores notas (${top.map((row) => row.section.title).join(" e ")}) vieram dos setores com mais peso em autoavaliação.`,
      });
    }
  }

  for (const row of confidence) {
    if (row.confidence !== "reduzida" || !row.motivo) continue;
    flags.push({
      id: "banda",
      setorId: row.sectionId,
      resumo: `Confiança reduzida em ${row.sectionId}: ${row.motivo}.`,
    });
  }

  return { flags, confidence };
}
