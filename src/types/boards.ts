import type { BoardViewConfig } from "@/types/board-view";

export type Prioridade = "alta" | "media" | "baixa";

export const PRIORIDADE_LABELS: Record<Prioridade, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export interface Subtarefa {
  id: string;
  texto: string;
  done: boolean;
}

export interface Comentario {
  id: string;
  autor_id: string | null;
  autor_nome: string;
  texto: string;
  created_at: string;
}

export interface BoardColumn {
  id: string;
  label: string;
  color: string;
  position: number;
}

export type PropertyType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "checkbox"
  | "url"
  | "email"
  | "phone";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  text: "Texto",
  number: "Número",
  date: "Data",
  select: "Seleção única",
  multiselect: "Seleção múltipla",
  checkbox: "Caixa de seleção",
  url: "Link",
  email: "Email",
  phone: "Telefone",
};

export interface BoardProperty {
  id: string;
  key: string;
  label: string;
  type: PropertyType;
  options: string[];
  position: number;
  visible: boolean;
}

export type CustomValue = string | number | boolean | string[] | null;

export interface BoardCard {
  id: string;
  column_id: string;
  titulo: string;
  prioridade: Prioridade;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  setor: string | null;
  prazo: string | null;
  related_org_id: string | null;
  related_org_name: string | null;
  observacoes: string | null;
  subtarefas: Subtarefa[];
  comentarios: Comentario[];
  bloqueada_por: string | null;
  position: number;
  custom_values: Record<string, CustomValue>;
}

export interface BuiltinFieldConfig {
  position: number;
  visible: boolean;
}

export type FieldConfig = Record<string, BuiltinFieldConfig>;

/** Campos fixos do card — mesma lista arrastável/ocultável das propriedades personalizadas no protótipo (state.properties), só não têm exclusão. */
export const BUILTIN_FIELDS: { key: string; label: string }[] = [
  { key: "titulo", label: "Título" },
  { key: "status", label: "Status" },
  { key: "prioridade", label: "Prioridade" },
  { key: "responsavel", label: "Responsável" },
  { key: "setor", label: "Setor" },
  { key: "prazo", label: "Prazo" },
  { key: "cliente", label: "Cliente" },
];

export type BoardModule = "atividades" | "crm";

export interface Board {
  id: string;
  org_id: string;
  name: string;
  module: BoardModule;
  icon: string;
  color: string;
  columns: BoardColumn[];
  cards: BoardCard[];
  properties: BoardProperty[];
  field_config: FieldConfig;
  view_config: BoardViewConfig;
}

export interface BoardAutomation {
  id: string;
  board_id: string;
  column_id: string;
  set_prioridade: Prioridade | null;
  set_responsavel_id: string | null;
  set_responsavel_nome: string | null;
  ativo: boolean;
}
