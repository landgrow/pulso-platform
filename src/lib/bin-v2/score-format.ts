/**
 * Exibição da nota do BIN (cores, faixas, rótulos). Sem cálculo e sem
 * pesos: pode ir para o navegador. O cálculo fica em `score.ts` (servidor).
 */

export type BinFaixa = "crítico" | "ruim" | "regular" | "bom" | "excelente";

export interface BinAnswerScore {
  kind: "nao_pontua" | "sem_resposta" | "excluida" | "pontos";
  valor: number | null;
  valorDeclarado: number | null;
}

export interface BinRefinementBlock {
  questionId: string;
  fundamentoId: string;
  declarado: number;
  final: number;
}

export interface BinExcludedQuestion {
  questionId: string;
  motivo: string;
}

export interface BinSectionScore {
  status: "sem_nota" | "incompleto" | "nao_avaliavel" | "nota";
  nota: number | null;
  faixa: BinFaixa | null;
  cobertura: { existem: number; total: number } | null;
  notaBruta: number | null;
  tetoSetor: number | null;
  peso8Zeros: string[];
  bloqueios: BinRefinementBlock[];
  pesosAplicaveis: number;
  pesosTotais: number;
  foraDoCalculo: BinExcludedQuestion[];
}

export function formatBinNota(nota: number): string {
  return Number.isInteger(nota)
    ? String(nota)
    : nota.toFixed(1).replace(".", ",");
}

export function binSectionScoreLabel(score: BinSectionScore): string | null {
  if (score.status === "nota" && score.nota !== null) {
    if (score.cobertura) {
      return `${formatBinNota(score.nota)} · ${score.cobertura.existem} de ${score.cobertura.total} elementos`;
    }
    return `${formatBinNota(score.nota)}${score.faixa ? ` · ${score.faixa}` : ""}`;
  }
  if (score.status === "nao_avaliavel") return "Sem nota";
  if (score.status === "incompleto") return "Incompleto";
  return null;
}

export const BIN_FAIXA_COLORS: Record<BinFaixa, string> = {
  crítico: "#B42318",
  ruim: "#C2410C",
  regular: "#B45309",
  bom: "#15803D",
  excelente: "#0F766E",
};

export function binFaixaColor(faixa: BinFaixa | string | null): string {
  if (
    faixa === "crítico" ||
    faixa === "ruim" ||
    faixa === "regular" ||
    faixa === "bom" ||
    faixa === "excelente"
  ) {
    return BIN_FAIXA_COLORS[faixa];
  }
  return "#94A3B8";
}

export function binFaixaTone(faixa: string | null): string {
  if (faixa === "crítico" || faixa === "ruim") return "text-error";
  if (faixa === "regular") return "text-warning";
  if (faixa === "bom" || faixa === "excelente") return "text-success";
  return "text-text-2";
}
