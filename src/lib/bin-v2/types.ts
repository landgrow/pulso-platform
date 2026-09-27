export const BIN_V2_INSTRUMENT = "bin_servicos_v2";
export const BIN_SPECIFY_SUFFIX = "__outro";

export type BinScale =
  | "ordinal"
  | "ordinal_invertido"
  | "ordinal_curva"
  | "nominal"
  | "nominal_multipla"
  | "nominal_perfil"
  | "aberta";

export type BinUi = "radio" | "checkbox" | "textarea";

export type BinLayer = "fundamento" | "pratica" | "refinamento";

export type BinDestination =
  "pontua" | "contexto" | "roteador" | "portao_1" | "portao_2";

export interface BinOption {
  value: string;
  label: string;
  needsSpecify: boolean;
  valorRelativo: number | null;
  observacao: string | null;
}

export interface BinQuestion {
  id: string;
  sectionId: string;
  prompt: string;
  help: string | null;
  scale: BinScale;
  ui: BinUi;
  layer: BinLayer | null;
  destinations: BinDestination[];
  composedWith: string | null;
  peso: number | null;
  fundamentoVinculado?: string | null;
  required: boolean;
  options: BinOption[];
}

export interface BinSection {
  id: string;
  prefix: string;
  title: string;
  color: string;
  questionIds: string[];
}

export interface BinVisibilityRule {
  questionId: string;
  showWhen: { questionId: string; equals: string };
}

export interface BinInstrument {
  instrument: string;
  title: string;
  generatedAt: string;
  notes: string[];
  visibility: BinVisibilityRule[];
  sections: BinSection[];
  questions: BinQuestion[];
}

export type BinAnswerValue = string | string[];
export type BinAnswers = Record<string, BinAnswerValue | undefined>;
