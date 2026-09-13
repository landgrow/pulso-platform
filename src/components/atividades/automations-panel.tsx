"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  getBoardById,
  listAutomations,
  createAutomation,
  toggleAutomation,
  deleteAutomation,
} from "@/app/actions/boards";
import { listTeamMembers } from "@/app/actions/team";
import {
  PRIORIDADE_LABELS,
  type BoardAutomation,
  type BoardColumn,
  type Prioridade,
} from "@/types/boards";

/** Regras "quando um card entra nesta coluna, define prioridade/responsável" — avaliadas de forma síncrona ao mover ou criar um card (sem cron, sem webhook). */
export function AutomationsPanel({
  boards,
}: {
  boards: { id: string; name: string }[];
}): JSX.Element {
  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [automations, setAutomations] = useState<BoardAutomation[]>([]);
  const [team, setTeam] = useState<
    { userId: string; fullName: string | null; email: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [newColumnId, setNewColumnId] = useState("");
  const [newPrioridade, setNewPrioridade] = useState<Prioridade | "">("");
  const [newResponsavelId, setNewResponsavelId] = useState("");

  async function refresh(id: string): Promise<void> {
    setLoading(true);
    const [boardResult, automationsResult, teamResult] = await Promise.all([
      getBoardById(id),
      listAutomations(id),
      listTeamMembers(),
    ]);
    if (boardResult.success) {
      const cols = [...boardResult.data.columns].sort(
        (a, b) => a.position - b.position,
      );
      setColumns(cols);
      setNewColumnId(cols[0]?.id ?? "");
    } else {
      toast.error(boardResult.error);
    }
    if (automationsResult.success) setAutomations(automationsResult.data);
    else toast.error(automationsResult.error);
    if (teamResult.success)
      setTeam(
        teamResult.data.map((t) => ({
          userId: t.userId,
          fullName: t.fullName,
          email: t.email,
        })),
      );
    setLoading(false);
  }

  useEffect(() => {
    if (!boardId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh() sets loading state, needed on every boardId change
    void refresh(boardId);
  }, [boardId]);

  async function handleCreate(): Promise<void> {
    if (!newColumnId) return;
    const result = await createAutomation({
      boardId,
      columnId: newColumnId,
      setPrioridade: newPrioridade || null,
      setResponsavelId: newResponsavelId || null,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setNewPrioridade("");
    setNewResponsavelId("");
    void refresh(boardId);
  }

  async function handleToggle(id: string, ativo: boolean): Promise<void> {
    const result = await toggleAutomation(id, ativo);
    if (!result.success) toast.error(result.error);
    else void refresh(boardId);
  }

  async function handleDelete(id: string): Promise<void> {
    const result = await deleteAutomation(id);
    if (!result.success) toast.error(result.error);
    else void refresh(boardId);
  }

  const columnById = Object.fromEntries(columns.map((c) => [c.id, c]));

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Automações</h2>
        <p className="text-sm text-text-2">
          Quando um card entra numa coluna, define prioridade e/ou responsável
          automaticamente.
        </p>
      </div>

      <div className="space-y-1.5 max-w-xs">
        <p className="text-xs text-text-2">Kanban</p>
        <Select value={boardId} onChange={(e) => setBoardId(e.target.value)}>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-text-2">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Carregando...
        </div>
      ) : (
        <>
          {automations.length === 0 ? (
            <p className="text-sm text-text-2 py-4">
              Nenhuma automação neste kanban ainda.
            </p>
          ) : (
            <div className="rounded-lg border border-border divide-y divide-border">
              {automations.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={a.ativo}
                    onChange={(e) => void handleToggle(a.id, e.target.checked)}
                    className="h-4 w-4"
                    title={a.ativo ? "Ativa" : "Inativa"}
                  />
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{
                      background:
                        columnById[a.column_id]?.color ?? "var(--text-faint)",
                    }}
                  />
                  <p className="text-sm flex-1 min-w-0">
                    Entrar em{" "}
                    <span className="font-medium">
                      {columnById[a.column_id]?.label ?? "?"}
                    </span>
                    {a.set_prioridade && (
                      <>
                        {" "}
                        → prioridade{" "}
                        <span className="font-medium">
                          {PRIORIDADE_LABELS[a.set_prioridade]}
                        </span>
                      </>
                    )}
                    {a.set_responsavel_nome && (
                      <>
                        {" "}
                        → responsável{" "}
                        <span className="font-medium">
                          {a.set_responsavel_nome}
                        </span>
                      </>
                    )}
                  </p>
                  <button
                    onClick={() => void handleDelete(a.id)}
                    className="shrink-0 text-text-2 hover:text-error"
                    aria-label="Excluir automação"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
            <p className="text-xs font-medium text-text-2">Nova automação</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <p className="text-[11px] text-text-2">Coluna</p>
                <Select
                  value={newColumnId}
                  onChange={(e) => setNewColumnId(e.target.value)}
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-text-2">Definir prioridade</p>
                <Select
                  value={newPrioridade}
                  onChange={(e) =>
                    setNewPrioridade(e.target.value as Prioridade | "")
                  }
                >
                  <option value="">(não mexe)</option>
                  {(Object.keys(PRIORIDADE_LABELS) as Prioridade[]).map((p) => (
                    <option key={p} value={p}>
                      {PRIORIDADE_LABELS[p]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-text-2">Definir responsável</p>
                <Select
                  value={newResponsavelId}
                  onChange={(e) => setNewResponsavelId(e.target.value)}
                >
                  <option value="">(não mexe)</option>
                  {team.map((t) => (
                    <option key={t.userId} value={t.userId}>
                      {t.fullName ?? t.email}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleCreate()}
              disabled={!newColumnId}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adicionar automação
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
