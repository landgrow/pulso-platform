import type { FieldConfig } from "@/types/boards";

/** Colunas do Plano de Ação — mesmo fluxo do board operacional da Land Grow. */
export const PLANO_DE_ACAO_COLUMNS: { label: string; color: string }[] = [
  { label: "A FAZER", color: "#94A3B8" },
  { label: "EM ANDAMENTO", color: "#6366F1" },
  { label: "REVISÃO INTERNA", color: "#EAB308" },
  { label: "REVISÃO DO CLIENTE", color: "#F97316" },
  { label: "Concluído", color: "#22C55E" },
  { label: "CANCELADO", color: "#EF4444" },
  { label: "Reuniões", color: "#8B5CF6" },
];

export const CRM_DEFAULT_COLUMNS: { label: string; color: string }[] = [
  { label: "A Fazer", color: "#94A3B8" },
  { label: "Em Andamento", color: "#6366F1" },
  { label: "Revisão", color: "#EAB308" },
  { label: "Concluído", color: "#22C55E" },
];

export const URGENCIA_PROPERTY = {
  key: "urgencia",
  label: "Urgência",
  type: "select" as const,
  options: ["Alta", "Média", "Baixa", "Sem prioridade"],
};

export function defaultAtividadesFieldConfig(): FieldConfig {
  return {
    titulo: { position: 0, visible: true },
    status: { position: 1, visible: true },
    prioridade: { position: 2, visible: true },
    responsavel: { position: 3, visible: true },
    setor: { position: 4, visible: true },
    prazo: { position: 5, visible: true },
    cliente: { position: 6, visible: true },
  };
}

export function isClosedColumnLabel(label: string): boolean {
  return /conclu|cancel/i.test(label);
}

export function findTodoColumnId(
  columns: { id: string; label: string }[],
): string | undefined {
  return (
    columns.find((c) => /a fazer|todo|backlog/i.test(c.label))?.id ??
    columns[0]?.id
  );
}

export function findDoneColumnId(
  columns: { id: string; label: string }[],
): string | undefined {
  return columns.find((c) => /conclu|feito|done/i.test(c.label))?.id;
}

export function columnLabelKey(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function boardHasColumnLabel(
  existing: string[],
  wanted: string,
): boolean {
  const wantedKey = columnLabelKey(wanted);
  return existing.some((label) => columnLabelKey(label) === wantedKey);
}
