import {
  cashflowFromLines,
  monthLabel,
  sumEntradasPorOrigem,
} from "@/lib/financeiro/ledger";
import { formatCurrency } from "@/lib/utils";
import {
  ENTRY_ORIGIN_LABELS,
  ENTRY_STATUS_LABELS,
  type FinanceEntry,
  type FinanceWorkspace,
} from "@/types/financeiro";
import type { PdfBlock } from "./pdf-document";

export function financePdfBlocks(workspace: FinanceWorkspace): PdfBlock[] {
  const month = workspace.month;
  const balance = workspace.monthBalance;
  const entradas = workspace.entries
    .filter(
      (entry) =>
        entry.kind === "entrada" && entry.competenceDate.startsWith(month),
    )
    .sort((a, b) => a.competenceDate.localeCompare(b.competenceDate));
  const saidas = workspace.entries
    .filter(
      (entry) =>
        entry.kind === "saida" && entry.competenceDate.startsWith(month),
    )
    .sort((a, b) => a.competenceDate.localeCompare(b.competenceDate));
  const cashflow = cashflowFromLines(
    workspace.entries.map((entry) => ({
      kind: entry.kind,
      status: entry.status,
      amount: entry.amount,
      competenceDate: entry.competenceDate,
    })),
    month,
  );
  const origins = Object.entries(sumEntradasPorOrigem(workspace.entries, month))
    .sort((a, b) => b[1] - a[1])
    .map(([origin, total]) => ({
      label:
        ENTRY_ORIGIN_LABELS[origin as keyof typeof ENTRY_ORIGIN_LABELS] ??
        origin,
      value: formatCurrency(total),
    }));

  const blocks: PdfBlock[] = [
    {
      type: "kpi",
      items: [
        { label: "Entrou", value: formatCurrency(balance.entradas) },
        {
          label: "Imposto das notas",
          value: formatCurrency(balance.impostosNotas),
        },
        { label: "Saiu", value: formatCurrency(balance.saidas) },
        { label: "Balanco", value: formatCurrency(balance.balanco) },
      ],
    },
    {
      type: "p",
      text: `Liquido (entrou - imposto): ${formatCurrency(balance.liquido)}.`,
    },
    { type: "h1", text: "Fluxo de 6 meses" },
    {
      type: "table",
      headers: ["Mes", "Entrou", "Saiu", "Balanco"],
      rows: cashflow.map((row) => [
        row.label,
        formatCurrency(row.inflows),
        formatCurrency(row.outflows),
        formatCurrency(row.net),
      ]),
    },
  ];

  if (origins.length > 0) {
    blocks.push({ type: "h1", text: "Entradas por origem" });
    blocks.push({
      type: "table",
      headers: ["Origem", "Valor"],
      rows: origins.map((row) => [row.label, row.value]),
    });
  }

  blocks.push({ type: "h1", text: `Entradas (${entradas.length})` });
  blocks.push({
    type: "table",
    headers: ["Data", "Descricao", "Origem", "Imposto", "Valor"],
    rows:
      entradas.length === 0
        ? [["-", "Nenhuma entrada neste mes", "-", "-", "-"]]
        : entradas.map((entry) => lineRow(entry, true)),
  });

  blocks.push({ type: "h1", text: `Saidas (${saidas.length})` });
  blocks.push({
    type: "table",
    headers: ["Data", "Descricao", "Status", "Valor"],
    rows:
      saidas.length === 0
        ? [["-", "Nenhuma despesa neste mes", "-", "-"]]
        : saidas.map((entry) => lineRow(entry, false)),
  });

  return blocks;
}

function lineRow(entry: FinanceEntry, income: boolean): string[] {
  const day = entry.competenceDate.slice(0, 10);
  const origin = ENTRY_ORIGIN_LABELS[entry.origin] ?? entry.origin;
  if (income) {
    return [
      day,
      entry.description || entry.relatedOrgName || origin,
      origin,
      formatCurrency(entry.taxAmount),
      formatCurrency(entry.amount),
    ];
  }
  return [
    day,
    entry.description || entry.categoryName || "Despesa",
    ENTRY_STATUS_LABELS[entry.status],
    formatCurrency(entry.amount),
  ];
}

export function financePdfTitle(month: string): string {
  return `Livro financeiro - ${monthLabel(month)}`;
}
