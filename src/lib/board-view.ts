import { PRIORIDADE_LABELS, type Board, type BoardCard } from "@/types/boards";
import type {
  ColorRule,
  FilterCondition,
  GroupByField,
  SortRule,
} from "@/types/board-view";

function fieldValue(
  card: BoardCard,
  field: FilterCondition["field"],
  board: Board,
): string {
  switch (field) {
    case "status":
      return board.columns.find((c) => c.id === card.column_id)?.label ?? "";
    case "prioridade":
      return card.prioridade;
    case "responsavel":
      return card.responsavel_id ?? "";
    case "setor":
      return card.setor ?? "";
    case "cliente":
      return card.related_org_id ?? "";
    case "titulo":
      return card.titulo;
    default:
      return "";
  }
}

export function applyFilters(
  cards: BoardCard[],
  filters: FilterCondition[],
  board: Board,
): BoardCard[] {
  return filters.reduce((acc, f) => {
    if (!f.value) return acc;
    return acc.filter((card) => {
      const actual = fieldValue(card, f.field, board);
      if (f.operator === "contains")
        return actual.toLowerCase().includes(f.value.toLowerCase());
      if (f.operator === "not_equals") return actual !== f.value;
      return actual === f.value;
    });
  }, cards);
}

const PRIORIDADE_ORDER: Record<string, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

function compareCriterion(
  a: BoardCard,
  b: BoardCard,
  field: SortRule["field"],
  board: Board,
): number {
  if (field === "prazo")
    return (a.prazo ?? "9999-99-99").localeCompare(b.prazo ?? "9999-99-99");
  if (field === "prioridade")
    return (
      (PRIORIDADE_ORDER[a.prioridade] ?? 9) -
      (PRIORIDADE_ORDER[b.prioridade] ?? 9)
    );
  if (field === "titulo") return a.titulo.localeCompare(b.titulo, "pt-BR");
  if (field === "responsavel")
    return (a.responsavel_nome ?? "").localeCompare(
      b.responsavel_nome ?? "",
      "pt-BR",
    );
  if (field === "status") {
    const la = board.columns.find((c) => c.id === a.column_id)?.label ?? "";
    const lb = board.columns.find((c) => c.id === b.column_id)?.label ?? "";
    return la.localeCompare(lb, "pt-BR");
  }
  return 0;
}

/** Ordenação em cascata: aplica os critérios em sequência, só passa pro próximo em caso de empate. */
export function sortCards(
  cards: BoardCard[],
  sort: SortRule[],
  board: Board,
): BoardCard[] {
  if (sort.length === 0) return cards;
  return [...cards].sort((a, b) => {
    for (const rule of sort) {
      const cmp = compareCriterion(a, b, rule.field, board);
      if (cmp !== 0) return rule.direction === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

export function getCardColorOverride(
  card: BoardCard,
  colorRules: ColorRule[],
): string | null {
  for (const rule of colorRules) {
    const actual =
      rule.field === "prioridade"
        ? card.prioridade
        : rule.field === "responsavel"
          ? (card.responsavel_id ?? "")
          : rule.field === "setor"
            ? (card.setor ?? "")
            : "";
    if (actual && actual === rule.value) return rule.color;
  }
  return null;
}

export interface CardGroup {
  key: string;
  label: string;
  color: string;
  cards: BoardCard[];
}

/** Agrupa os cards em "colunas visuais" — por status (as colunas reais) ou por outro campo (prioridade/responsável/setor). */
export function groupCards(
  cards: BoardCard[],
  groupBy: GroupByField,
  board: Board,
): CardGroup[] {
  if (groupBy === "status") {
    return [...board.columns]
      .sort((a, b) => a.position - b.position)
      .map((col) => ({
        key: col.id,
        label: col.label,
        color: col.color,
        cards: cards
          .filter((c) => c.column_id === col.id)
          .sort((a, b) => a.position - b.position),
      }));
  }

  if (groupBy === "prioridade") {
    return (["alta", "media", "baixa"] as const).map((p) => ({
      key: p,
      label: PRIORIDADE_LABELS[p],
      color: p === "alta" ? "#EF4444" : p === "media" ? "#F59E0B" : "#94A3B8",
      cards: cards.filter((c) => c.prioridade === p),
    }));
  }

  if (groupBy === "responsavel") {
    const groups = new Map<string, CardGroup>();
    for (const card of cards) {
      const key = card.responsavel_id ?? "__none__";
      const label = card.responsavel_nome ?? "Sem responsável";
      if (!groups.has(key))
        groups.set(key, { key, label, color: "#94A3B8", cards: [] });
      groups.get(key)!.cards.push(card);
    }
    return [...groups.values()];
  }

  // setor
  const groups = new Map<string, CardGroup>();
  for (const card of cards) {
    const key = card.setor ?? "__none__";
    const label = card.setor ?? "Sem setor";
    if (!groups.has(key))
      groups.set(key, { key, label, color: "#94A3B8", cards: [] });
    groups.get(key)!.cards.push(card);
  }
  return [...groups.values()];
}
