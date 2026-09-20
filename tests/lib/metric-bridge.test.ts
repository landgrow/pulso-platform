import { describe, expect, it } from "vitest";
import {
  collectOperacaoBridges,
  inferMetricFonte,
} from "@/lib/ops/metric-bridge";

describe("metric bridge", () => {
  it("binds R$ key results to finance and SMART clientes to CRM", () => {
    expect(inferMetricFonte("R$")).toBe("financeiro_receita");
    expect(inferMetricFonte("clientes")).toBe("crm_clientes");

    const bridges = collectOperacaoBridges([
      {
        status: "concluido",
        smartEspecifica: "Conseguir 5 clientes de 3,5k",
        keyResults: [
          {
            currentValue: 100000,
            targetValue: 100000,
            unit: "R$",
          },
        ],
      },
    ]);

    expect(bridges.receitaObjetivosBrl).toBe(100000);
    expect(bridges.clientesObjetivos).toBe(5);
  });

  it("does not invent revenue from an open objective", () => {
    expect(
      collectOperacaoBridges([
        {
          status: "ativo",
          smartEspecifica: "Conseguir 5 clientes de 3,5k",
          keyResults: [{ currentValue: 0, targetValue: 100000, unit: "R$" }],
        },
      ]),
    ).toEqual({ receitaObjetivosBrl: 0, clientesObjetivos: 0 });
  });
});
