"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { updateBoardViewConfig } from "@/app/actions/boards";
import { listTeamMembers } from "@/app/actions/team";
import { PRIORIDADE_LABELS, type Board } from "@/types/boards";
import { SETOR_COLORS } from "@/lib/constants";
import {
  FILTER_FIELD_LABELS,
  FILTER_FREE_TEXT_FIELDS,
  FILTER_OPERATOR_LABELS,
  type FilterCondition,
  type FilterField,
  type FilterOperator,
} from "@/types/board-view";

const FILTER_FIELDS = Object.keys(FILTER_FIELD_LABELS) as FilterField[];
const FILTER_OPERATORS = Object.keys(
  FILTER_OPERATOR_LABELS,
) as FilterOperator[];

function fieldValueOptions(
  field: FilterField,
  board: Board,
  team: { userId: string; fullName: string | null; email: string }[],
): { value: string; label: string }[] | null {
  if (field === "status")
    return board.columns.map((c) => ({ value: c.id, label: c.label }));
  if (field === "prioridade")
    return (
      Object.keys(PRIORIDADE_LABELS) as (keyof typeof PRIORIDADE_LABELS)[]
    ).map((p) => ({
      value: p,
      label: PRIORIDADE_LABELS[p],
    }));
  if (field === "setor")
    return Object.keys(SETOR_COLORS).map((s) => ({ value: s, label: s }));
  if (field === "responsavel")
    return team.map((t) => ({ value: t.userId, label: t.fullName ?? t.email }));
  if (field === "cliente") {
    const seen = new Map<string, string>();
    for (const c of board.cards) {
      if (c.related_org_id && c.related_org_name)
        seen.set(c.related_org_id, c.related_org_name);
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }
  return null;
}

/** Barra "🔍 Filtrar" + chips dos filtros ativos + modal construtor de condições — mesmo recurso do protótipo (filterBtn/filterTags/filterModal). */
export function BoardFilterBar({
  board,
  onChanged,
}: {
  board: Board;
  onChanged: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const filters = board.view_config.filters;

  async function handleRemove(id: string): Promise<void> {
    const result = await updateBoardViewConfig({
      boardId: board.id,
      patch: { filters: filters.filter((f) => f.id !== id) },
    });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-text-2 hover:text-text-1 hover:border-text-2"
      >
        <Filter className="h-3 w-3" />
        Filtrar
        {filters.length > 0 && (
          <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-white text-[10px]">
            {filters.length}
          </span>
        )}
      </button>

      {filters.map((f) => (
        <span
          key={f.id}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-1 text-xs"
        >
          {FILTER_FIELD_LABELS[f.field]} {FILTER_OPERATOR_LABELS[f.operator]}{" "}
          &quot;{f.value}&quot;
          <button
            onClick={() => void handleRemove(f.id)}
            aria-label="Remover filtro"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <FilterModal
        board={board}
        open={open}
        onOpenChange={setOpen}
        onChanged={onChanged}
      />
    </div>
  );
}

function FilterModal({
  board,
  open,
  onOpenChange,
  onChanged,
}: {
  board: Board;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}): JSX.Element {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="p-0">
          <SheetTitle>Filtrar tarefas</SheetTitle>
        </SheetHeader>
        <FilterConditionEditor
          board={board}
          onChanged={onChanged}
          onDone={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

/** Construtor de condições em si — usado tanto no modal "Filtrar" quanto na aba Filtros de Configurações da base. */
export function FilterConditionEditor({
  board,
  onChanged,
  onDone,
}: {
  board: Board;
  onChanged: () => void;
  onDone?: () => void;
}): JSX.Element {
  const [draft, setDraft] = useState<FilterCondition[]>(
    board.view_config.filters,
  );
  const [team, setTeam] = useState<
    { userId: string; fullName: string | null; email: string }[]
  >([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void listTeamMembers().then((result) => {
      if (result.success)
        setTeam(
          result.data.map((t) => ({
            userId: t.userId,
            fullName: t.fullName,
            email: t.email,
          })),
        );
    });
  }, []);

  function updateRow(id: string, patch: Partial<FilterCondition>): void {
    setDraft((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function addRow(): void {
    setDraft((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        field: "prioridade",
        operator: "equals",
        value: "",
      },
    ]);
  }

  function removeRow(id: string): void {
    setDraft((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    const result = await updateBoardViewConfig({
      boardId: board.id,
      patch: { filters: draft },
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onDone?.();
    onChanged();
  }

  async function handleClear(): Promise<void> {
    setDraft([]);
    setSaving(true);
    const result = await updateBoardViewConfig({
      boardId: board.id,
      patch: { filters: [] },
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onDone?.();
    onChanged();
  }

  return (
    <div className="space-y-2">
      {draft.length === 0 && (
        <p className="text-xs text-text-2 py-2">
          Nenhum filtro ativo. Adicione condições abaixo.
        </p>
      )}
      {draft.map((row) => (
        <FilterRow
          key={row.id}
          row={row}
          board={board}
          team={team}
          onChange={(patch) => updateRow(row.id, patch)}
          onRemove={() => removeRow(row.id)}
        />
      ))}

      <button
        onClick={addRow}
        className="w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-text-2 hover:text-text-1 hover:border-text-2"
      >
        + Adicionar condição
      </button>

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleClear()}
          disabled={saving}
        >
          Limpar filtros
        </Button>
        <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
          Aplicar
        </Button>
      </div>
    </div>
  );
}

function FilterRow({
  row,
  board,
  team,
  onChange,
  onRemove,
}: {
  row: FilterCondition;
  board: Board;
  team: { userId: string; fullName: string | null; email: string }[];
  onChange: (patch: Partial<FilterCondition>) => void;
  onRemove: () => void;
}): JSX.Element {
  const options = useMemo(
    () => fieldValueOptions(row.field, board, team),
    [row.field, board, team],
  );
  const isFreeText = FILTER_FREE_TEXT_FIELDS.includes(row.field);

  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={row.field}
        onChange={(e) =>
          onChange({ field: e.target.value as FilterField, value: "" })
        }
        className="w-32 shrink-0"
      >
        {FILTER_FIELDS.map((f) => (
          <option key={f} value={f}>
            {FILTER_FIELD_LABELS[f]}
          </option>
        ))}
      </Select>
      <Select
        value={row.operator}
        onChange={(e) =>
          onChange({ operator: e.target.value as FilterOperator })
        }
        className="w-32 shrink-0"
      >
        {FILTER_OPERATORS.map((op) => (
          <option key={op} value={op}>
            {FILTER_OPERATOR_LABELS[op]}
          </option>
        ))}
      </Select>
      {isFreeText || !options ? (
        <Input
          value={row.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="valor"
          className="flex-1 h-9"
        />
      ) : (
        <Select
          value={row.value}
          onChange={(e) => onChange({ value: e.target.value })}
          className="flex-1"
        >
          <option value="">Selecione...</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
      <button
        onClick={onRemove}
        className="shrink-0 text-text-2 hover:text-error"
        aria-label="Remover condição"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
