/**
 * Entrada do BIN para TELAS ("use client"). Só exporta o que não carrega o
 * método da Land Grow: consultas que recebem o questionário (público) como
 * parâmetro, visibilidade, progresso, validação, rotas, fluxo e formatação.
 *
 * Pesos, notas das opções, gatilhos, pontuação, portões e entregáveis ficam em
 * módulos "server-only" — a tela recebe o resultado pronto (`view.ts`).
 */

export type {
  BinAnswers,
  BinAnswerValue,
  BinInstrument,
  BinPackId,
  BinQuestion,
  BinSection,
} from "./types";
export {
  getBinQuestion,
  requireBinQuestion,
  getBinSection,
  questionsInSection,
  packIdFor,
  setDefaultBinInstrument,
} from "./instrument-core";
export {
  isQuestionVisible,
  visibleQuestions,
  pruneHiddenAnswers,
} from "./visibility";
export {
  calcBinProgress,
  countBinSection,
  binProgressFromPayload,
} from "./progress";
export {
  isQuestionAnswered,
  specifyKey,
  selectedNeedsSpecify,
  selectedLabels,
  selectedOptions,
} from "./answers";
export {
  parseBinAnswers,
  parseBinGeral,
  parseBinDirected,
  parseBinSection,
} from "./schema";
export {
  resolveBinRoute,
  binDirectedFormStatus,
  binRouteLabel,
  BIN_ROUTE_LABELS,
} from "./route";
export type { BinRoute, BinDirectedFormStatus } from "./route";
export { binSectionToBloco, binQuestionToCampo } from "./to-blocos";
export { BIN_SECTION_DESCRIPTIONS, binSectionColor } from "./section-meta";
export {
  binSharePath,
  binShareUrl,
  shareSectionsOf,
  resolveShareSectionAmong,
} from "./share-core";
export type { BinShareSection } from "./share-core";
export {
  emptyBinFlow,
  readBinFlow,
  appendBinEvent,
  binEventHeadline,
} from "./flow";
export type { BinEventKind, BinFlowMeta, BinStaffEvent } from "./flow";
export { formatBinAnswer } from "./format-answer";
export {
  BIN_FAIXA_COLORS,
  binFaixaColor,
  binFaixaTone,
  binSectionScoreLabel,
  formatBinNota,
} from "./score-format";
export type { BinFaixa, BinSectionScore } from "./score-format";

// Só tipos (somem no build) — o cálculo continua no servidor.
export type { BinGateResult, BinGatesReading } from "./gates";
export type { BinVerifyFlag } from "./verify";
export type { BinReading, BinSectionReading } from "./reading";
export type {
  BinDeliverable,
  BinDeliverableKind,
  BinDeliverableSet,
} from "./deliverables";
export type { BinReadingView, BinSectorRow } from "./view";
