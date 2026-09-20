"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGrid, BarChart3, Loader2, Plus, Trash2 } from "lucide-react";
import { useBoardList } from "@/hooks/use-board-list";
import { BoardContent } from "@/components/boards/board-content";
import { AtividadesDashboard } from "@/components/atividades/atividades-dashboard";
import { cn } from "@/lib/utils";
import { CollapsibleSubnav } from "@/components/layout/nav-collapse";

type Nav = { kind: "board"; boardId: string } | { kind: "metricas" };

/** Shell simplificado de CRM — mesma infraestrutura de kanban de Atividades (custom properties, filtros, configurações), mas com submenu enxuto: só a lista de kanbans (Leads, Parceiros etc) + Métricas. */
export function CrmShell({ orgId }: { orgId: string }): JSX.Element {
  const {
    boards,
    activeBoardId,
    board,
    loading,
    openBoard,
    handleNewBoard,
    handleDeleteBoard,
    refreshCurrentBoard,
    updateBoardOptimistic,
  } = useBoardList(orgId, "crm");

  const [nav, setNav] = useState<Nav>({ kind: "board", boardId: "" });

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || !activeBoardId) return;
    initializedRef.current = true;
    setNav({ kind: "board", boardId: activeBoardId });
  }, [activeBoardId]);

  function selectBoard(id: string): void {
    setNav({ kind: "board", boardId: id });
    void openBoard(id);
  }

  return (
    <div className="flex items-stretch">
      <CollapsibleSubnav storageKey="pulso-nav-crm">
        <aside className="flex h-full min-h-[calc(100vh-9rem)] flex-col border-r border-border bg-surface-1">
          <div className="flex-1 overflow-y-auto p-2">
            <p className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-2">
              CRM
            </p>
            <nav className="space-y-0.5">
              {boards.map((b) => (
                <div key={b.id} className="group flex items-center">
                  <button
                    onClick={() => selectBoard(b.id)}
                    className={cn(
                      "flex-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left min-w-0",
                      nav.kind === "board" && nav.boardId === b.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-text-2 hover:bg-surface-2 hover:text-text-1",
                    )}
                  >
                    <span
                      className="shrink-0 h-5 w-5 rounded flex items-center justify-center text-[11px] leading-none"
                      style={{ background: b.color }}
                    >
                      {b.icon}
                    </span>
                    <span className="truncate">{b.name}</span>
                  </button>
                  {nav.kind === "board" && nav.boardId === b.id && (
                    <button
                      onClick={() => void handleDeleteBoard(b.id)}
                      className="shrink-0 p-1 text-text-2 hover:text-error opacity-0 group-hover:opacity-100"
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </nav>
            <button
              onClick={() => void handleNewBoard()}
              className="w-full mt-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-text-2 hover:bg-surface-2 hover:text-text-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo kanban
            </button>

            <div className="h-px bg-border my-2" />
            <nav className="space-y-0.5">
              <button
                onClick={() => setNav({ kind: "metricas" })}
                className={cn(
                  "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left",
                  nav.kind === "metricas"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-2 hover:bg-surface-2 hover:text-text-1",
                )}
              >
                <BarChart3 className="h-4 w-4 shrink-0" />
                <span>Métricas</span>
              </button>
            </nav>
          </div>
        </aside>
      </CollapsibleSubnav>

      <div className="flex-1 min-w-0 pl-4">
        {nav.kind === "metricas" && (
          <AtividadesDashboard
            orgId={orgId}
            module="crm"
            title="Métricas"
            subtitle="Resumo de todos os kanbans de CRM (leads, parceiros etc)."
          />
        )}
        {nav.kind === "board" &&
          (loading ? (
            <div className="flex items-center justify-center py-16 text-text-2">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Carregando board...
            </div>
          ) : board ? (
            <BoardContent
              board={board}
              onChanged={() => void refreshCurrentBoard()}
              updateBoardOptimistic={updateBoardOptimistic}
            />
          ) : boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <LayoutGrid className="h-8 w-8 text-text-2" />
              <p className="text-sm text-text-2 max-w-xs">
                Nenhum kanban de CRM ainda. Crie o primeiro para começar a
                separar Leads, Parceiros etc.
              </p>
              <button
                onClick={() => void handleNewBoard("Leads")}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                Novo kanban
              </button>
            </div>
          ) : (
            <p className="text-sm text-text-2">
              Não foi possível carregar o board.
            </p>
          ))}
      </div>
    </div>
  );
}
