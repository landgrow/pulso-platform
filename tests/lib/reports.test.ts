import { describe, expect, it } from "vitest";
import { financePdfBlocks } from "@/lib/reports/finance-report";
import { renderPdfReport } from "@/lib/reports/pdf-document";
import { worksmartPdfBlocks } from "@/lib/reports/worksmart-report";
import type { FinanceWorkspace } from "@/types/financeiro";
import type { WorksmartObjective } from "@/types/worksmart";

const workspace: FinanceWorkspace = {
  orgId: "00000000-0000-0000-0000-000000000001",
  month: "2026-09",
  today: "2026-09-19",
  monthBalance: {
    entradas: 18000,
    impostosNotas: 600,
    saidas: 2500,
    liquido: 17400,
    balanco: 14900,
  },
  summary: {
    saldo: 0,
    entradasMes: 18000,
    saidasMes: 2500,
    aReceber: 0,
    aPagar: 0,
    atrasadosReceber: 0,
    atrasadosPagar: 0,
    impostosMes: 600,
    dre: {
      receitaBruta: 0,
      deducoes: 0,
      receitaLiquida: 0,
      despesas: 0,
      impostos: 0,
      resultado: 0,
    },
    cashflow: [],
  },
  accounts: [],
  categories: [],
  entries: [
    {
      id: "e1",
      orgId: "00000000-0000-0000-0000-000000000001",
      accountId: null,
      categoryId: null,
      kind: "entrada",
      status: "realizado",
      amount: 18000,
      currency: "BRL",
      competenceDate: "2026-09-05",
      dueDate: null,
      paidAt: "2026-09-05",
      description: "Fee JS Construtora",
      notes: null,
      source: "manual",
      relatedOrgId: null,
      relatedContratoId: null,
      relatedInvoiceId: null,
      relatedTaxId: null,
      origin: "fee_mensal",
      taxRate: 6,
      taxAmount: 600,
      invoiceRef: "1",
      accountName: null,
      categoryName: null,
      categoryKind: null,
      relatedOrgName: "JS Construtora",
    },
    {
      id: "e2",
      orgId: "00000000-0000-0000-0000-000000000001",
      accountId: null,
      categoryId: null,
      kind: "saida",
      status: "realizado",
      amount: 2500,
      currency: "BRL",
      competenceDate: "2026-09-08",
      dueDate: null,
      paidAt: "2026-09-08",
      description: "Contador",
      notes: null,
      source: "manual",
      relatedOrgId: null,
      relatedContratoId: null,
      relatedInvoiceId: null,
      relatedTaxId: null,
      origin: "despesa",
      taxRate: 0,
      taxAmount: 0,
      invoiceRef: null,
      accountName: null,
      categoryName: "Operacional",
      categoryKind: "despesa",
      relatedOrgName: null,
    },
  ],
  invoices: [],
  taxes: [],
  deductions: [],
  clients: [],
};

const objective: WorksmartObjective = {
  id: "o1",
  orgId: "00000000-0000-0000-0000-000000000001",
  title: "Faturar 100k",
  setor: "Comercial",
  smartEspecifica: "Faturar 100 mil no trimestre",
  smartMensuravel: "100000 R$",
  smartAtingivel: "Carteira atual",
  smartRelevante: "Caixa",
  smartTemporal: "2026-09-30",
  status: "concluido",
  createdAt: "2026-09-01",
  orgName: "Land Grow",
  keyResults: [
    {
      id: "kr1",
      objectiveId: "o1",
      title: "Receita",
      targetValue: 100000,
      currentValue: 100000,
      unit: "R$",
      position: 0,
      actions: [
        {
          id: "a1",
          keyResultId: "kr1",
          oQue: "Fechar contratos do trimestre",
          quemId: null,
          quemNome: "Nayara",
          quando: "2026-09-15",
          onde: null,
          porQue: null,
          como: null,
          quanto: null,
          cardId: "c1",
          boardId: "b1",
          columnLabel: "Concluido",
          done: true,
        },
      ],
    },
  ],
};

describe("PDF report models", () => {
  it("puts the monthly book numbers into the finance PDF blocks", () => {
    const blocks = financePdfBlocks(workspace);
    const kpis = blocks.find((block) => block.type === "kpi");
    expect(
      kpis?.type === "kpi" && kpis.items.map((item) => item.value),
    ).toEqual(["R$ 18.000,00", "R$ 600,00", "R$ 2.500,00", "R$ 14.900,00"]);
    const tables = blocks.filter((block) => block.type === "table");
    expect(
      tables.some(
        (table) =>
          table.type === "table" && table.rows[0]?.[1] === "Fee JS Construtora",
      ),
    ).toBe(true);
  });

  it("keeps OKR result and generated activity on the WorkSmart PDF", () => {
    const blocks = worksmartPdfBlocks([objective]);
    expect(
      blocks.some(
        (block) =>
          block.type === "h1" && block.text.includes("Resultado atingido"),
      ),
    ).toBe(true);
    const actions = blocks.find(
      (block) => block.type === "table" && block.headers.includes("O que"),
    );
    expect(actions?.type === "table" && actions.rows[0]?.[1]).toBe(
      "Fechar contratos do trimestre",
    );
  });

  it("renders a valid PDF header", async () => {
    const bytes = await renderPdfReport({
      title: "Livro financeiro",
      subtitle: "teste",
      blocks: financePdfBlocks(workspace),
    });
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });
});
