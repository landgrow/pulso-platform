import type { Board } from "@/types/boards";
import type { MetricasGerais } from "@/app/actions/metricas";
import { PRIORIDADE_LABELS } from "@/types/boards";

export interface BoardExportRow {
  Kanban: string;
  Coluna: string;
  Titulo: string;
  Prioridade: string;
  Responsavel: string;
  Setor: string;
  Prazo: string;
  Cliente: string;
  Observacoes: string;
}

export function boardToRows(board: Board): BoardExportRow[] {
  const columns = new Map(board.columns.map((c) => [c.id, c.label]));
  return [...board.cards]
    .sort((a, b) => a.position - b.position)
    .map((card) => ({
      Kanban: board.name,
      Coluna: columns.get(card.column_id) ?? "",
      Titulo: card.titulo,
      Prioridade: PRIORIDADE_LABELS[card.prioridade],
      Responsavel: card.responsavel_nome ?? "",
      Setor: card.setor ?? "",
      Prazo: card.prazo ?? "",
      Cliente: card.related_org_name ?? "",
      Observacoes: card.observacoes ?? "",
    }));
}

export function rowsToCsv(rows: BoardExportRow[]): string {
  const headers: (keyof BoardExportRow)[] = [
    "Kanban",
    "Coluna",
    "Titulo",
    "Prioridade",
    "Responsavel",
    "Setor",
    "Prazo",
    "Cliente",
    "Observacoes",
  ];
  const escape = (value: string): string => {
    if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
    return value;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((key) => escape(String(row[key] ?? ""))).join(","));
  }
  return `\uFEFF${lines.join("\n")}`;
}

export function metricasToRows(data: MetricasGerais): Record<string, string>[] {
  const rows: Record<string, string>[] = [
    {
      Bloco: "CRM",
      Indicador: "Total de cards",
      Valor: String(data.crm.totalCards),
    },
    {
      Bloco: "CRM",
      Indicador: "Convertidos",
      Valor: String(data.crm.convertidos),
    },
    {
      Bloco: "CRM",
      Indicador: "Taxa de conversão (%)",
      Valor: data.crm.taxaConversao.toFixed(1),
    },
    {
      Bloco: "Financeiro",
      Indicador: "Contratos",
      Valor: String(data.financeiro.totalContratos),
    },
  ];
  for (const k of data.crm.porKanban) {
    rows.push({
      Bloco: "CRM por kanban",
      Indicador: k.nome,
      Valor: String(k.total),
    });
  }
  for (const [setor, total] of Object.entries(data.crm.porSetor)) {
    rows.push({
      Bloco: "CRM por setor",
      Indicador: setor,
      Valor: String(total),
    });
  }
  for (const [status, total] of Object.entries(data.financeiro.porStatus)) {
    rows.push({
      Bloco: "Contratos por status",
      Indicador: status,
      Valor: String(total),
    });
  }
  for (const [moeda, total] of Object.entries(
    data.financeiro.receitaAtivaPorMoeda,
  )) {
    rows.push({
      Bloco: "Receita ativa",
      Indicador: moeda,
      Valor: String(total),
    });
  }
  return rows;
}
