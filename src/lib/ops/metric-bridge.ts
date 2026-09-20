import { isKrAchieved, isObjectiveAchieved } from "@/lib/worksmart/cascade";
import { parseMetricFromText } from "@/lib/worksmart/suggest-cascade";
import type { WorksmartStatus } from "@/types/worksmart";

export type MetricFonte = "manual" | "financeiro_receita" | "crm_clientes";

export interface ObjectiveMetricRow {
  status: WorksmartStatus;
  smartEspecifica: string | null;
  keyResults: Array<{
    currentValue: number | null;
    targetValue: number | null;
    unit: string | null;
    actions?: { done: boolean }[];
  }>;
}

export interface OperacaoBridges {
  receitaObjetivosBrl: number;
  clientesObjetivos: number;
}

export function isMoneyUnit(unit: string | null | undefined): boolean {
  const raw = unit?.trim().toLowerCase() ?? "";
  return raw === "r$" || raw === "brl" || raw === "reais" || raw === "real";
}

export function isClientUnit(unit: string | null | undefined): boolean {
  return /clientes?|contratos?/i.test(unit ?? "");
}

export function inferMetricFonte(unit: string | null | undefined): MetricFonte {
  if (isMoneyUnit(unit)) return "financeiro_receita";
  if (isClientUnit(unit)) return "crm_clientes";
  return "manual";
}

/**
 * Uma meta WorkSmart concluída (ou KR batido) vira o mesmo número do
 * financeiro/CRM. Sem isso o Dashboard lê contratos e o OKR lê um campo solto.
 */
export function collectOperacaoBridges(
  objectives: ObjectiveMetricRow[],
): OperacaoBridges {
  let receitaObjetivosBrl = 0;
  let clientesObjetivos = 0;

  for (const objective of objectives) {
    const achieved = isObjectiveAchieved({
      status: objective.status,
      keyResults: objective.keyResults.map((kr) => ({
        currentValue: kr.currentValue,
        targetValue: kr.targetValue,
        actions: kr.actions ?? [],
      })),
    });

    let countedClientsFromKr = false;
    for (const kr of objective.keyResults) {
      const hit =
        achieved ||
        isKrAchieved({
          currentValue: kr.currentValue,
          targetValue: kr.targetValue,
          actions: kr.actions ?? [],
        });
      if (!hit) continue;
      const fonte = inferMetricFonte(kr.unit);
      const value = kr.currentValue ?? kr.targetValue ?? 0;
      if (fonte === "financeiro_receita") {
        receitaObjetivosBrl += value;
      }
      if (fonte === "crm_clientes") {
        clientesObjetivos += value;
        countedClientsFromKr = true;
      }
    }

    if (achieved && !countedClientsFromKr) {
      const fromSmart = parseMetricFromText(objective.smartEspecifica);
      if (fromSmart && isClientUnit(fromSmart.unit)) {
        clientesObjetivos += fromSmart.value;
      }
    }
  }

  return { receitaObjetivosBrl, clientesObjetivos };
}
