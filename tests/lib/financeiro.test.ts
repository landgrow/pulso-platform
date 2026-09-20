import { describe, expect, it } from "vitest";
import {
  accountBalance,
  cashflowFromLines,
  composeReceitaAtiva,
  lastMonths,
  parseMoney,
  summarizeLedger,
  summarizeMonth,
  taxOnInvoice,
} from "@/lib/financeiro/ledger";

describe("financeiro ledger", () => {
  it("parses Brazilian money", () => {
    expect(parseMoney("100000")).toBe(100000);
    expect(parseMoney("100.000,50")).toBe(100000.5);
    expect(Number.isNaN(parseMoney("abc"))).toBe(true);
  });

  it("builds a six-month cash window", () => {
    expect(lastMonths("2026-09", 6)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  it("uses the monthly book as the same number Métricas reads", () => {
    expect(
      composeReceitaAtiva({
        monthBalance: {
          entradas: 18000,
          impostosNotas: 600,
          saidas: 2500,
          liquido: 17400,
          balanco: 14900,
        },
        receitaContratosBrl: 100000,
        receitaObjetivosBrl: 100000,
      }),
    ).toBe(17400);
    expect(
      composeReceitaAtiva({
        monthBalance: {
          entradas: 0,
          impostosNotas: 0,
          saidas: 0,
          liquido: 0,
          balanco: 0,
        },
        receitaContratosBrl: 20000,
        receitaObjetivosBrl: 100000,
      }),
    ).toBe(120000);
  });

  it("summarizes cash, aging and DRE without inventing numbers", () => {
    const summary = summarizeLedger({
      today: "2026-09-19",
      month: "2026-09",
      accountBalances: [1000],
      entries: [
        {
          kind: "entrada",
          status: "realizado",
          amount: 100000,
          competenceDate: "2026-09-10",
          dueDate: "2026-09-10",
          paidAt: "2026-09-10",
          categoryKind: "receita",
        },
        {
          kind: "saida",
          status: "realizado",
          amount: 8000,
          competenceDate: "2026-09-12",
          dueDate: "2026-09-12",
          paidAt: "2026-09-12",
          categoryKind: "despesa",
        },
        {
          kind: "saida",
          status: "realizado",
          amount: 6000,
          competenceDate: "2026-09-15",
          dueDate: "2026-09-15",
          paidAt: "2026-09-15",
          categoryKind: "imposto",
        },
        {
          kind: "entrada",
          status: "previsto",
          amount: 3500,
          competenceDate: "2026-08-01",
          dueDate: "2026-08-20",
          paidAt: null,
          categoryKind: "receita",
        },
        {
          kind: "saida",
          status: "previsto",
          amount: 1200,
          competenceDate: "2026-09-30",
          dueDate: "2026-09-30",
          paidAt: null,
          categoryKind: "despesa",
        },
      ],
      taxes: [
        {
          amount: 6000,
          status: "pago",
          dueDate: "2026-09-20",
          periodStart: "2026-09-01",
          hasEntry: true,
        },
      ],
      deductions: [
        {
          amount: 500,
          periodStart: "2026-09-01",
          periodEnd: "2026-09-30",
        },
      ],
    });

    expect(summary.saldo).toBe(1000);
    expect(summary.entradasMes).toBe(100000);
    expect(summary.saidasMes).toBe(14000);
    expect(summary.aReceber).toBe(3500);
    expect(summary.atrasadosReceber).toBe(3500);
    expect(summary.aPagar).toBe(1200);
    expect(summary.atrasadosPagar).toBe(0);
    expect(summary.impostosMes).toBe(6000);
    expect(summary.dre).toEqual({
      receitaBruta: 100000,
      deducoes: 500,
      receitaLiquida: 99500,
      despesas: 8000,
      impostos: 6000,
      resultado: 85500,
    });
    expect(summary.cashflow.at(-1)).toMatchObject({
      month: "2026-09",
      inflows: 100000,
      outflows: 14000,
      net: 86000,
    });
  });

  it("marks invoice tax and closes the month as in minus tax minus out", () => {
    expect(taxOnInvoice(10000, 6)).toBe(600);
    expect(taxOnInvoice(10000, 6, 500)).toBe(500);

    expect(
      summarizeMonth(
        [
          {
            kind: "entrada",
            status: "realizado",
            amount: 10000,
            taxAmount: 600,
            competenceDate: "2026-09-05",
          },
          {
            kind: "entrada",
            status: "realizado",
            amount: 8000,
            taxAmount: 0,
            competenceDate: "2026-09-12",
          },
          {
            kind: "saida",
            status: "realizado",
            amount: 2500,
            taxAmount: 0,
            competenceDate: "2026-09-08",
          },
          {
            kind: "saida",
            status: "realizado",
            amount: 900,
            taxAmount: 0,
            competenceDate: "2026-08-01",
          },
        ],
        "2026-09",
      ),
    ).toEqual({
      entradas: 18000,
      impostosNotas: 600,
      saidas: 2500,
      liquido: 17400,
      balanco: 14900,
    });
  });

  it("builds competence cashflow for the same 6 months the charts read", () => {
    expect(
      cashflowFromLines(
        [
          {
            kind: "entrada",
            status: "realizado",
            amount: 10000,
            competenceDate: "2026-09-05",
          },
          {
            kind: "saida",
            status: "previsto",
            amount: 2500,
            competenceDate: "2026-09-08",
          },
          {
            kind: "entrada",
            status: "realizado",
            amount: 4000,
            competenceDate: "2026-08-20",
          },
          {
            kind: "entrada",
            status: "cancelado",
            amount: 999,
            competenceDate: "2026-09-01",
          },
        ],
        "2026-09",
      ).map((row) => ({
        month: row.month,
        inflows: row.inflows,
        outflows: row.outflows,
        net: row.net,
      })),
    ).toEqual([
      { month: "2026-04", inflows: 0, outflows: 0, net: 0 },
      { month: "2026-05", inflows: 0, outflows: 0, net: 0 },
      { month: "2026-06", inflows: 0, outflows: 0, net: 0 },
      { month: "2026-07", inflows: 0, outflows: 0, net: 0 },
      { month: "2026-08", inflows: 4000, outflows: 0, net: 4000 },
      { month: "2026-09", inflows: 10000, outflows: 2500, net: 7500 },
    ]);
  });

  it("computes account balance from realized entries only", () => {
    expect(
      accountBalance(100, [
        {
          kind: "entrada",
          status: "realizado",
          amount: 50,
          competenceDate: "2026-09-01",
          dueDate: null,
          paidAt: "2026-09-01",
          categoryKind: "receita",
        },
        {
          kind: "saida",
          status: "previsto",
          amount: 20,
          competenceDate: "2026-09-02",
          dueDate: "2026-09-10",
          paidAt: null,
          categoryKind: "despesa",
        },
      ]),
    ).toBe(150);
  });
});
