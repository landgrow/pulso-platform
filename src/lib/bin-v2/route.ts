import type { BinAnswers } from "./types";

/**
 * Rota do diagnóstico depois do geral.
 * G06 (e G07 se a empresa faz mais de uma coisa) decide o formulário.
 * Comércio no instrumento = varejo na fala do cliente.
 */
export type BinRoute = "servicos" | "varejo" | "industria" | "pre_operacao";

export const BIN_ROUTE_LABELS: Record<BinRoute, string> = {
  servicos: "Serviços",
  varejo: "Varejo",
  industria: "Indústria",
  pre_operacao: "Pré-operação",
};

/** Só serviços tem formulário v2 pronto. Varejo e indústria continuam na v1. */
export type BinDirectedFormStatus = "ready" | "pending" | "coverage";

export function binDirectedFormStatus(route: BinRoute): BinDirectedFormStatus {
  if (route === "servicos") return "ready";
  if (route === "pre_operacao") return "coverage";
  return "pending";
}

function asString(value: BinAnswers[string]): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Lê G06 e, se precisar, G07.
 * G07:4 (faz só uma coisa) e G07:5 (não sei) não fecham rota:
 * o cliente precisa marcar fabricar, revender ou prestar serviços.
 */
export function resolveBinRoute(answers: BinAnswers): BinRoute | null {
  const g06 = asString(answers.G06);
  if (g06 === "G06:1") return "industria";
  if (g06 === "G06:2") return "varejo";
  if (g06 === "G06:3") return "servicos";
  if (g06 === "G06:5") return "pre_operacao";
  if (g06 !== "G06:4") return null;

  const g07 = asString(answers.G07);
  if (g07 === "G07:1") return "industria";
  if (g07 === "G07:2") return "varejo";
  if (g07 === "G07:3") return "servicos";
  return null;
}

export function binRouteLabel(route: BinRoute | null): string {
  if (!route) return "ainda sem categoria";
  return BIN_ROUTE_LABELS[route];
}
