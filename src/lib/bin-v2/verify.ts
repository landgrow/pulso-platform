import { isQuestionAnswered, selectedLabels } from "./answers";
import type { BinFlagClass, BinTriggerRule } from "./catalog";
import { getBinQuestion } from "./instrument";
import type { BinPack } from "./pack";
import { labelMatches, normalizeBinText } from "./text";
import type { BinAnswers, BinInstrument, BinQuestion } from "./types";

export type BinVerifyStatus = "disparou" | "aguardando" | "ok";

export interface BinVerifyFlag {
  regra: string;
  classe: BinFlagClass;
  status: BinVerifyStatus;
  questaoA: string;
  questaoB: string;
  respostaA: string | null;
  respostaB: string | null;
  precedencia: string | null;
  acao: string;
  resumo: string;
}

function asClass(value: string): BinFlagClass {
  if (value === "I" || value === "D" || value === "P") return value;
  return "F";
}

function specialRaw(raw: string): "texto" | "acao" | "labels" {
  const text = normalizeBinText(raw);
  if (!text || text.includes("texto livre")) return "texto";
  if (text.includes("ver acao")) return "acao";
  return "labels";
}

function sectionReady(
  question: BinQuestion | undefined,
  completed: Set<string>,
): boolean {
  if (!question) return false;
  if (question.sectionId === "geral") return true;
  return completed.has(question.sectionId);
}

function sideMatches(
  question: BinQuestion,
  answers: BinAnswers,
  triggers: string[],
  raw: string,
): boolean {
  const kind = specialRaw(raw);
  if (kind === "texto") {
    return isQuestionAnswered(question, answers);
  }
  if (kind === "acao") return false;
  const labels = selectedLabels(question, answers);
  if (question.ui === "textarea") {
    return isQuestionAnswered(question, answers);
  }
  return labels.some((label) => labelMatches(label, triggers));
}

function a01a02Gap(answers: BinAnswers, instrument: BinInstrument): boolean {
  const a02 = getBinQuestion("A02", instrument);
  const a01 = getBinQuestion("A01", instrument);
  if (!a02 || !a01) return false;
  if (!isQuestionAnswered(a02, answers) || !isQuestionAnswered(a01, answers)) {
    return false;
  }
  const have = new Set(selectedLabels(a01, answers).map(normalizeBinText));
  return selectedLabels(a02, answers).some((label) => {
    const n = normalizeBinText(label);
    if (n.includes("nenhuma")) return false;
    return !have.has(n);
  });
}

function invertedB(
  rule: BinTriggerRule,
  questionB: BinQuestion,
  answers: BinAnswers,
): boolean {
  if (!/ausente/i.test(rule.acao)) return false;
  if (specialRaw(rule.disparaBRaw) !== "labels") return false;
  const labels = selectedLabels(questionB, answers);
  return !labels.some((label) => labelMatches(label, rule.disparaB));
}

function flagResumo(
  rule: BinTriggerRule,
  a: string | null,
  b: string | null,
): string {
  const left = a ? `${rule.questaoA} (${a})` : rule.questaoA;
  const right = b ? `${rule.questaoB} (${b})` : rule.questaoB;
  return `${rule.regra} · ${left} × ${right}`;
}

export function verifyBinAnswers(
  answers: BinAnswers,
  pack: BinPack,
  completedSectionIds: string[],
): BinVerifyFlag[] {
  const instrument = pack.instrument;
  const completed = new Set(completedSectionIds);
  const flags: BinVerifyFlag[] = [];

  for (const rule of pack.gatilhos) {
    const questionA = getBinQuestion(rule.questaoA, instrument);
    const questionB = getBinQuestion(rule.questaoB, instrument);
    const readyA = sectionReady(questionA, completed);
    const readyB = sectionReady(questionB, completed);
    if (!readyA || !readyB || !questionA || !questionB) {
      continue;
    }

    const answeredA = isQuestionAnswered(questionA, answers);
    const answeredB = isQuestionAnswered(questionB, answers);
    if (!answeredA || !answeredB) {
      flags.push({
        regra: rule.regra,
        classe: asClass(rule.classe),
        status: "aguardando",
        questaoA: rule.questaoA,
        questaoB: rule.questaoB,
        respostaA: answeredA
          ? selectedLabels(questionA, answers).join("; ")
          : null,
        respostaB: answeredB
          ? selectedLabels(questionB, answers).join("; ")
          : null,
        precedencia: rule.precedencia,
        acao: rule.acao,
        resumo: `${rule.regra} ainda não fecha: falta ${!answeredA ? rule.questaoA : rule.questaoB}.`,
      });
      continue;
    }

    const labelsA = selectedLabels(questionA, answers);
    const labelsB = selectedLabels(questionB, answers);
    const textA = labelsA.join("; ") || null;
    const textB = labelsB.join("; ") || null;

    let fired = false;
    if (rule.regra === "A-1" || specialRaw(rule.disparaBRaw) === "acao") {
      fired =
        rule.regra === "A-1"
          ? a01a02Gap(answers, instrument)
          : sideMatches(questionA, answers, rule.disparaA, rule.disparaARaw) &&
            invertedB(rule, questionB, answers);
    } else {
      const matchA = sideMatches(
        questionA,
        answers,
        rule.disparaA,
        rule.disparaARaw,
      );
      const matchB = invertedB(rule, questionB, answers)
        ? true
        : sideMatches(questionB, answers, rule.disparaB, rule.disparaBRaw);
      fired = matchA && matchB;
    }

    if (!fired) continue;

    flags.push({
      regra: rule.regra,
      classe: asClass(rule.classe),
      status: "disparou",
      questaoA: rule.questaoA,
      questaoB: rule.questaoB,
      respostaA: textA,
      respostaB: textB,
      precedencia: rule.precedencia,
      acao: rule.acao,
      resumo: flagResumo(rule, textA, textB),
    });
  }

  return flags.filter((flag) => flag.status === "disparou");
}
