/** Mesmo bloco "Filtrar / Ordenar / Agrupar / Cor" do protótipo (kanban.html) — guardado em boards.view_config. */

export type FilterField =
  "status" | "prioridade" | "responsavel" | "setor" | "cliente" | "titulo";
export type FilterOperator = "equals" | "not_equals" | "contains";

export interface FilterCondition {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string;
}

export const FILTER_FIELD_LABELS: Record<FilterField, string> = {
  status: "Status",
  prioridade: "Prioridade",
  responsavel: "Responsável",
  setor: "Setor",
  cliente: "Cliente",
  titulo: "Título",
};

export const FILTER_OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: "é igual a",
  not_equals: "não é igual a",
  contains: "contém",
};

/** Campos com valor de texto livre — os demais usam um <select> com as opções do board. */
export const FILTER_FREE_TEXT_FIELDS: FilterField[] = ["titulo"];

export type SortField =
  "prazo" | "prioridade" | "titulo" | "status" | "responsavel";

export interface SortRule {
  id: string;
  field: SortField;
  direction: "asc" | "desc";
}

export const SORT_FIELD_META: Record<
  SortField,
  { label: string; ascLabel: string; descLabel: string }
> = {
  prazo: {
    label: "Prazo",
    ascLabel: "Mais antigo primeiro",
    descLabel: "Mais recente primeiro",
  },
  prioridade: {
    label: "Prioridade",
    ascLabel: "Alta → Baixa",
    descLabel: "Baixa → Alta",
  },
  titulo: { label: "Nome", ascLabel: "A → Z", descLabel: "Z → A" },
  status: { label: "Status", ascLabel: "A → Z", descLabel: "Z → A" },
  responsavel: { label: "Responsável", ascLabel: "A → Z", descLabel: "Z → A" },
};

export type GroupByField = "status" | "prioridade" | "responsavel" | "setor";

export const GROUP_BY_LABELS: Record<GroupByField, string> = {
  status: "Status (padrão)",
  prioridade: "Prioridade",
  responsavel: "Responsável",
  setor: "Setor",
};

/** Regra "se <field> = <value>, colore o card com <color>" — mesma lógica simples do protótipo (sem operadores). */
export interface ColorRule {
  id: string;
  field: "prioridade" | "responsavel" | "setor" | "status";
  value: string;
  color: string;
}

export const COLOR_RULE_SWATCHES = [
  "#DC2626",
  "#D97706",
  "#16A34A",
  "#3B82F6",
  "#A78BFA",
  "#F472B6",
];

export interface BoardViewConfig {
  filters: FilterCondition[];
  sort: SortRule[];
  groupBy: GroupByField;
  colorRules: ColorRule[];
}

export function normalizeViewConfig(
  raw: Partial<BoardViewConfig> | null | undefined,
): BoardViewConfig {
  return {
    filters: raw?.filters ?? [],
    sort: raw?.sort ?? [],
    groupBy: raw?.groupBy ?? "status",
    colorRules: raw?.colorRules ?? [],
  };
}
