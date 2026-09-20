"use client";

import { Loader2, LayoutGrid } from "lucide-react";
import { useBoardList } from "@/hooks/use-board-list";
import { BoardContent } from "@/components/boards/board-content";
import { ListSecondaryPanel } from "@/components/layout/list-secondary-panel";

/** Kanban de uma org (cliente ou interna) — painel lateral com a lista de kanbans + conteúdo do board aberto. */
export function KanbanBoard({ orgId }: { orgId: string }): JSX.Element {
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
  } = useBoardList(orgId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-2">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando board...
      </div>
    );
  }

  if (!board) {
    return (
      <p className="text-sm text-text-2">Não foi possível carregar o board.</p>
    );
  }

  return (
    <div className="flex items-stretch">
      <ListSecondaryPanel
        sectionLabel="Plano de Ação"
        items={boards}
        activeId={activeBoardId}
        icon={<LayoutGrid className="h-4 w-4" />}
        createLabel="Novo kanban"
        onSelect={(id) => void openBoard(id)}
        onCreate={() => void handleNewBoard()}
        onDelete={(id) => void handleDeleteBoard(id)}
      />
      <div className="flex-1 min-w-0 pl-4">
        <BoardContent
          board={board}
          onChanged={() => void refreshCurrentBoard()}
          updateBoardOptimistic={updateBoardOptimistic}
        />
      </div>
    </div>
  );
}
