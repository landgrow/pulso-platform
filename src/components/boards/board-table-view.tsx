"use client";

import { useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteCard, moveCard } from "@/app/actions/boards";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, isOverdue } from "@/lib/utils";
import { SETOR_COLORS } from "@/lib/constants";
import {
  PRIORIDADE_LABELS,
  type Board,
  type BoardCard,
  type BoardProperty,
  type CustomValue,
  type FieldConfig,
} from "@/types/boards";

function isFieldVisible(fieldConfig: FieldConfig, key: string): boolean {
  return fieldConfig[key]?.visible ?? true;
}

const PRIORIDADE_BADGE: Record<
  BoardCard["prioridade"],
  "destructive" | "warning" | "secondary"
> = {
  alta: "destructive",
  media: "warning",
  baixa: "secondary",
};

function renderCustomValue(
  property: BoardProperty,
  value: CustomValue,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (property.type === "checkbox") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  if (property.type === "date") return formatDate(String(value));
  return String(value);
}

export function BoardTableView({
  board,
  onOpenCard,
  onChanged,
}: {
  board: Board;
  onOpenCard: (card: BoardCard) => void;
  onChanged?: () => void;
}): JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmNode, confirm] = useConfirm();
  const columnById = Object.fromEntries(board.columns.map((c) => [c.id, c]));
  const rows = [...board.cards].sort((a, b) => {
    const colA = columnById[a.column_id]?.position ?? 0;
    const colB = columnById[b.column_id]?.position ?? 0;
    return colA - colB || a.position - b.position;
  });
  const visibleProperties = board.properties.filter((p) => p.visible);
  const fc = board.field_config;
  const showStatus = isFieldVisible(fc, "status");
  const showPrioridade = isFieldVisible(fc, "prioridade");
  const showResponsavel = isFieldVisible(fc, "responsavel");
  const showPrazo = isFieldVisible(fc, "prazo");
  const showSetor = isFieldVisible(fc, "setor");
  const showCliente = isFieldVisible(fc, "cliente");

  // Seleção só de cards que ainda existem (o board pode ter mudado por fora).
  const selectedIds = rows.filter((r) => selected.has(r.id)).map((r) => r.id);
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  function toggle(id: string, on: boolean): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function moveSelected(columnId: string): Promise<void> {
    if (!columnId || selectedIds.length === 0) return;
    setBusy(true);
    const base =
      board.cards
        .filter((c) => c.column_id === columnId)
        .reduce((max, c) => Math.max(max, c.position), -1) + 1;
    const results = await Promise.all(
      selectedIds.map((cardId, i) =>
        moveCard({ cardId, columnId, position: base + i }),
      ),
    );
    setBusy(false);
    const failed = results.filter((r) => !r.success).length;
    if (failed > 0) toast.error(`${failed} tarefa(s) não mudaram de status.`);
    else toast.success(`${selectedIds.length} tarefa(s) movidas.`);
    setSelected(new Set());
    onChanged?.();
  }

  async function deleteSelected(): Promise<void> {
    const n = selectedIds.length;
    const ok = await confirm({
      title: n === 1 ? "Excluir 1 tarefa?" : `Excluir ${n} tarefas?`,
      description:
        "As tarefas, subtarefas e comentários somem para todo mundo. Não dá para desfazer.",
      confirmLabel: n === 1 ? "Excluir tarefa" : "Excluir tarefas",
    });
    if (!ok) return;
    setBusy(true);
    const results = await Promise.all(selectedIds.map((id) => deleteCard(id)));
    setBusy(false);
    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      const first = failed[0];
      toast.error(`${failed.length} tarefa(s) não foram excluídas.`, {
        description: first && !first.success ? first.error : undefined,
      });
    } else {
      toast.success(n === 1 ? "Tarefa excluída." : `${n} tarefas excluídas.`);
    }
    setSelected(new Set());
    onChanged?.();
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-text-2 py-8 text-center">Nenhum card ainda.</p>
    );
  }

  return (
    <div className="space-y-3">
      {confirmNode}
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          <span className="font-medium text-text-1">
            {selectedIds.length === 1
              ? "1 selecionada"
              : `${selectedIds.length} selecionadas`}
          </span>
          <label className="flex items-center gap-2 text-text-2">
            <span className="sr-only">Mover para</span>
            <select
              disabled={busy}
              value=""
              onChange={(e) => void moveSelected(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface-1 px-2 text-sm text-text-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Mover para…</option>
              {board.columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => void deleteSelected()}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Excluir
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setSelected(new Set())}
            className="ml-auto"
          >
            <X className="h-3.5 w-3.5" />
            Limpar seleção
          </Button>
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                aria-label="Selecionar todas"
                checked={
                  allSelected
                    ? true
                    : selectedIds.length > 0
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={(state) =>
                  setSelected(
                    state === true ? new Set(rows.map((r) => r.id)) : new Set(),
                  )
                }
              />
            </TableHead>
            <TableHead>Card</TableHead>
            {showStatus && <TableHead>Status</TableHead>}
            {showPrioridade && <TableHead>Prioridade</TableHead>}
            {showResponsavel && <TableHead>Responsável</TableHead>}
            {showPrazo && <TableHead>Prazo</TableHead>}
            {showSetor && <TableHead>Setor</TableHead>}
            {showCliente && <TableHead>Cliente</TableHead>}
            {visibleProperties.map((prop) => (
              <TableHead key={prop.id}>{prop.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((card) => {
            const col = columnById[card.column_id];
            const overdue = isOverdue(card.prazo);
            return (
              <TableRow
                key={card.id}
                onClick={() => onOpenCard(card)}
                data-state={selected.has(card.id) ? "selected" : undefined}
                className="cursor-pointer data-[state=selected]:bg-primary/5"
              >
                <TableCell
                  className="w-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    aria-label={`Selecionar ${card.titulo}`}
                    checked={selected.has(card.id)}
                    onCheckedChange={(state) => toggle(card.id, state === true)}
                  />
                </TableCell>
                <TableCell className="font-medium">{card.titulo}</TableCell>
                {showStatus && (
                  <TableCell>
                    {col && (
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: col.color }}
                        />
                        {col.label}
                      </span>
                    )}
                  </TableCell>
                )}
                {showPrioridade && (
                  <TableCell>
                    <Badge variant={PRIORIDADE_BADGE[card.prioridade]}>
                      {PRIORIDADE_LABELS[card.prioridade]}
                    </Badge>
                  </TableCell>
                )}
                {showResponsavel && (
                  <TableCell className="text-text-2">
                    {card.responsavel_nome ?? "—"}
                  </TableCell>
                )}
                {showPrazo && (
                  <TableCell
                    className={
                      overdue ? "text-error font-medium" : "text-text-2"
                    }
                  >
                    {card.prazo ? formatDate(card.prazo) : "—"}
                  </TableCell>
                )}
                {showSetor && (
                  <TableCell className="text-text-2">
                    {card.setor ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{
                            background:
                              SETOR_COLORS[card.setor] ?? "var(--text-faint)",
                          }}
                        />
                        {card.setor}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                )}
                {showCliente && (
                  <TableCell className="text-text-2">
                    {card.related_org_name ?? "—"}
                  </TableCell>
                )}
                {visibleProperties.map((prop) => (
                  <TableCell key={prop.id} className="text-text-2">
                    {renderCustomValue(
                      prop,
                      card.custom_values[prop.key] ?? null,
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
