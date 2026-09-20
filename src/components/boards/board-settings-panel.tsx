"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Settings,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { InlineText } from "@/components/layout/inline-text";
import { AddPropertyDialog } from "@/components/boards/add-property-dialog";
import { FilterConditionEditor } from "@/components/boards/board-filter-bar";
import {
  EquipeTab,
  VisibilidadeTab,
  OrdenarTab,
  AgruparTab,
} from "@/components/boards/board-settings-tabs";
import {
  updateProperty,
  deleteProperty,
  updateFieldVisibility,
  reorderBoardFields,
  createColumn,
  renameColumn,
  deleteColumn,
  reorderColumns,
  updateBoardAppearance,
} from "@/app/actions/boards";
import {
  BUILTIN_FIELDS,
  PROPERTY_TYPE_LABELS,
  type Board,
} from "@/types/boards";
import { cn } from "@/lib/utils";

type FieldRow =
  | {
      kind: "builtin";
      key: string;
      label: string;
      visible: boolean;
      position: number;
    }
  | {
      kind: "custom";
      key: string;
      propertyId: string;
      label: string;
      typeLabel: string;
      visible: boolean;
      position: number;
    };

function buildFieldRows(board: Board): FieldRow[] {
  const builtinRows: FieldRow[] = BUILTIN_FIELDS.map((f, i) => {
    const cfg = board.field_config[f.key];
    return {
      kind: "builtin",
      key: f.key,
      label: f.label,
      visible: cfg?.visible ?? true,
      position: cfg?.position ?? i,
    };
  });
  const customRows: FieldRow[] = board.properties.map((p) => ({
    kind: "custom",
    key: p.key,
    propertyId: p.id,
    label: p.label,
    typeLabel: PROPERTY_TYPE_LABELS[p.type],
    visible: p.visible,
    // customs entram depois dos campos fixos por padrão — só vira posição explícita quando alguém reordena.
    position: p.position + 100,
  }));
  return [...builtinRows, ...customRows].sort(
    (a, b) => a.position - b.position,
  );
}

// Mesmo conjunto do protótipo (ICONS/COLORS em kanban.html) — emoji + cor da "base" (kanban).
const ICON_OPTIONS = [
  "📋",
  "📊",
  "🎯",
  "💼",
  "📅",
  "📄",
  "✉️",
  "📈",
  "⚙️",
  "🔗",
  "💡",
  "🔥",
  "⭐",
  "📌",
  "✅",
  "🔍",
];
const COLOR_OPTIONS = [
  "#3B82F6",
  "#F472B6",
  "#FB923C",
  "#A78BFA",
  "#FBBF24",
  "#EF4444",
  "#22C55E",
  "#27272A",
];

const CONFIG_TABS = [
  { key: "layout", label: "Layout" },
  { key: "equipe", label: "Equipe" },
  { key: "visibilidade", label: "Visibilidade" },
  { key: "filtros", label: "Filtros" },
  { key: "ordenar", label: "Ordenar" },
  { key: "agrupar", label: "Agrupar" },
] as const;
type ConfigTab = (typeof CONFIG_TABS)[number]["key"];

/** Painel "Configurações da base" — propriedades personalizadas e colunas do kanban, mesmo padrão do protótipo (config-panel). */
export function BoardSettingsPanel({
  board,
  onChanged,
}: {
  board: Board;
  onChanged: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ConfigTab>("layout");
  const [newColumnLabel, setNewColumnLabel] = useState("");

  const fieldRows = buildFieldRows(board);
  const columns = [...board.columns].sort((a, b) => a.position - b.position);

  async function handleToggleVisible(row: FieldRow): Promise<void> {
    const result =
      row.kind === "builtin"
        ? await updateFieldVisibility({
            boardId: board.id,
            fieldKey: row.key,
            visible: !row.visible,
          })
        : await updateProperty({
            propertyId: row.propertyId,
            visible: !row.visible,
          });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleRenameField(
    row: FieldRow,
    label: string,
  ): Promise<void> {
    if (row.kind !== "custom") return;
    const result = await updateProperty({ propertyId: row.propertyId, label });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleDeleteField(row: FieldRow): Promise<void> {
    if (row.kind !== "custom") return;
    const result = await deleteProperty(row.propertyId);
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleMoveField(
    index: number,
    direction: -1 | 1,
  ): Promise<void> {
    const target = index + direction;
    if (target < 0 || target >= fieldRows.length) return;
    const next = [...fieldRows];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    const order = next.map((r) => ({ kind: r.kind, key: r.key }));
    const result = await reorderBoardFields({ boardId: board.id, order });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleRenameColumn(
    columnId: string,
    label: string,
  ): Promise<void> {
    const result = await renameColumn({ columnId, label });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleDeleteColumn(columnId: string): Promise<void> {
    if (columns.length <= 1) {
      toast.error("O quadro precisa de pelo menos uma coluna.");
      return;
    }
    const result = await deleteColumn(columnId);
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleMoveColumn(
    index: number,
    direction: -1 | 1,
  ): Promise<void> {
    const target = index + direction;
    if (target < 0 || target >= columns.length) return;
    const next = [...columns];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    const result = await reorderColumns({
      boardId: board.id,
      orderedIds: next.map((c) => c.id),
    });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleAddColumn(): Promise<void> {
    const label = newColumnLabel.trim();
    if (!label) return;
    setNewColumnLabel("");
    const result = await createColumn({ boardId: board.id, label });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleSetIcon(icon: string): Promise<void> {
    const result = await updateBoardAppearance({ boardId: board.id, icon });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleSetColor(color: string): Promise<void> {
    const result = await updateBoardAppearance({ boardId: board.id, color });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Settings className="h-3.5 w-3.5 mr-1.5" />
        Configurações
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto w-full max-w-lg p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle>&#9881; Configurações da base</SheetTitle>
          </SheetHeader>

          <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto border-b border-border">
            {CONFIG_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                  tab === t.key
                    ? "bg-primary/10 text-primary"
                    : "text-text-1 hover:bg-surface-2",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-6">
            {tab === "equipe" && <EquipeTab />}
            {tab === "visibilidade" && (
              <VisibilidadeTab board={board} onChanged={onChanged} />
            )}
            {tab === "filtros" && (
              <FilterConditionEditor board={board} onChanged={onChanged} />
            )}
            {tab === "ordenar" && (
              <OrdenarTab board={board} onChanged={onChanged} />
            )}
            {tab === "agrupar" && (
              <AgruparTab board={board} onChanged={onChanged} />
            )}
            {tab === "layout" && (
              <>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Ícone da base</h4>
                  <p className="text-xs text-text-2">
                    Escolha um emoji para representar este kanban na lista.
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    {ICON_OPTIONS.map((ic) => (
                      <button
                        key={ic}
                        onClick={() => void handleSetIcon(ic)}
                        className={cn(
                          "h-8 w-8 rounded-md border flex items-center justify-center text-base",
                          ic === board.icon
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-surface-2",
                        )}
                        aria-label={`Ícone ${ic}`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold">Cor da capa</h4>
                  <p className="text-xs text-text-2">
                    Cor usada no ícone deste kanban.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_OPTIONS.map((cl) => (
                      <button
                        key={cl}
                        onClick={() => void handleSetColor(cl)}
                        className={cn(
                          "h-7 w-7 rounded-full border-2",
                          cl === board.color
                            ? "border-text-1"
                            : "border-transparent",
                        )}
                        style={{ background: cl }}
                        aria-label={`Cor ${cl}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold">Propriedades</h4>
                  <p className="text-xs text-text-2">
                    Arraste (setas) para reordenar. Clique no olho para
                    ocultar/mostrar no card. Campos fixos (título, status,
                    prioridade...) não podem ser excluídos.
                  </p>
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {fieldRows.map((row, i) => (
                      <div
                        key={`${row.kind}:${row.key}`}
                        className="flex items-center gap-2 px-3 py-2"
                      >
                        <div className="flex flex-col shrink-0">
                          <button
                            onClick={() => void handleMoveField(i, -1)}
                            disabled={i === 0}
                            className="text-text-2 hover:text-text-1 disabled:opacity-20"
                            aria-label="Mover para cima"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => void handleMoveField(i, 1)}
                            disabled={i === fieldRows.length - 1}
                            className="text-text-2 hover:text-text-1 disabled:opacity-20"
                            aria-label="Mover para baixo"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        {row.kind === "custom" ? (
                          <InlineText
                            value={row.label}
                            onCommit={(label) =>
                              void handleRenameField(row, label)
                            }
                            className="flex-1 text-sm min-w-0"
                            inputClassName="h-7 flex-1 text-sm"
                          />
                        ) : (
                          <span className="flex-1 text-sm min-w-0 truncate">
                            {row.label}
                          </span>
                        )}
                        <span className="text-[10px] uppercase tracking-wide text-text-2 shrink-0">
                          {row.kind === "custom" ? row.typeLabel : "Fixo"}
                        </span>
                        <button
                          onClick={() => void handleToggleVisible(row)}
                          className="shrink-0 text-text-2 hover:text-text-1"
                          title={
                            row.visible ? "Ocultar no card" : "Mostrar no card"
                          }
                        >
                          {row.visible ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {row.kind === "custom" && (
                          <button
                            onClick={() => void handleDeleteField(row)}
                            className="shrink-0 text-text-2 hover:text-error"
                            aria-label="Excluir propriedade"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <AddPropertyDialog
                    boardId={board.id}
                    onCreated={onChanged}
                    fullWidth
                    triggerLabel="Nova propriedade"
                  />
                </div>

                <div className="space-y-2 pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold">Colunas do Kanban</h4>
                  <p className="text-xs text-text-2">
                    Gerencie as colunas do quadro.
                  </p>
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {columns.map((col, i) => (
                      <div
                        key={col.id}
                        className="flex items-center gap-2 px-3 py-2"
                      >
                        <div className="flex flex-col shrink-0">
                          <button
                            onClick={() => void handleMoveColumn(i, -1)}
                            disabled={i === 0}
                            className="text-text-2 hover:text-text-1 disabled:opacity-20"
                            aria-label="Mover para cima"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => void handleMoveColumn(i, 1)}
                            disabled={i === columns.length - 1}
                            className="text-text-2 hover:text-text-1 disabled:opacity-20"
                            aria-label="Mover para baixo"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: col.color }}
                        />
                        <InlineText
                          value={col.label}
                          onCommit={(label) =>
                            void handleRenameColumn(col.id, label)
                          }
                          className="flex-1 text-sm min-w-0"
                          inputClassName="h-7 flex-1 text-sm"
                        />
                        <button
                          onClick={() => void handleDeleteColumn(col.id)}
                          className="shrink-0 text-text-2 hover:text-error"
                          aria-label="Excluir coluna"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Nome da coluna..."
                      className="h-8 text-sm"
                      value={newColumnLabel}
                      onChange={(e) => setNewColumnLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleAddColumn();
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleAddColumn()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
