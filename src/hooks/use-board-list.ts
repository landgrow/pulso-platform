"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getBoard,
  getBoardById,
  listBoards,
  createBoard,
  deleteBoard,
} from "@/app/actions/boards";
import type { Board, BoardModule } from "@/types/boards";

interface BoardListItem {
  id: string;
  name: string;
  icon: string;
  color: string;
}

/** Gerencia a lista de kanbans de um módulo (Atividades ou CRM) da org + o board atualmente aberto — usado pelo KanbanBoard (por-cliente), AtividadesShell e CrmShell (internos). */
export function useBoardList(
  orgId: string,
  module: BoardModule = "atividades",
): {
  boards: BoardListItem[];
  activeBoardId: string | null;
  board: Board | null;
  loading: boolean;
  openBoard: (id: string) => Promise<void>;
  handleNewBoard: (name?: string) => Promise<void>;
  handleDeleteBoard: (id: string) => Promise<void>;
  refreshCurrentBoard: () => Promise<void>;
  updateBoardOptimistic: (updater: (b: Board) => Board) => void;
} {
  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const listResult = await listBoards(orgId, module);
    let list = listResult.success ? listResult.data : [];
    // Só Atividades garante um kanban padrão na primeira visita — CRM começa
    // vazio, o usuário cria o primeiro kanban (Leads, Parceiros etc) manualmente.
    if (list.length === 0 && module === "atividades") {
      const ensured = await getBoard(orgId);
      if (!ensured.success) {
        toast.error(ensured.error);
        setLoading(false);
        return;
      }
      const refreshed = await listBoards(orgId, module);
      list = refreshed.success ? refreshed.data : [];
    }
    setBoards(list);
    const targetId = list[0]?.id ?? null;
    setActiveBoardId(targetId);
    if (targetId) {
      const boardResult = await getBoardById(targetId);
      if (boardResult.success) setBoard(boardResult.data);
      else toast.error(boardResult.error);
    } else {
      setBoard(null);
    }
    setLoading(false);
  }, [orgId, module]);

  // Guarda de montagem: em dev, StrictMode monta o efeito 2x — sem essa
  // trava, as duas chamadas concorrentes de load() achariam a lista vazia
  // ao mesmo tempo e criariam 2 kanbans padrão duplicados.
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, module]);

  async function openBoard(id: string): Promise<void> {
    setActiveBoardId(id);
    setLoading(true);
    const result = await getBoardById(id);
    if (result.success) setBoard(result.data);
    else toast.error(result.error);
    setLoading(false);
  }

  async function handleNewBoard(name?: string): Promise<void> {
    const result = await createBoard({
      orgId,
      module,
      name: name ?? `Kanban ${boards.length + 1}`,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    const listResult = await listBoards(orgId, module);
    if (listResult.success) setBoards(listResult.data);
    await openBoard(result.data.id);
  }

  async function handleDeleteBoard(id: string): Promise<void> {
    if (module === "atividades" && boards.length <= 1) {
      toast.error("Precisa manter pelo menos um kanban.");
      return;
    }
    const result = await deleteBoard(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    const listResult = await listBoards(orgId, module);
    const list = listResult.success ? listResult.data : [];
    setBoards(list);
    const nextId = list[0]?.id ?? null;
    if (nextId) await openBoard(nextId);
    else {
      setActiveBoardId(null);
      setBoard(null);
    }
  }

  // Recarrega só o board atualmente aberto — usada depois de qualquer
  // mutação (card, coluna, propriedade). Diferente de load() (memoizada só
  // com [orgId], usada apenas na montagem), essa é redefinida a cada render
  // e sempre lê o activeBoardId atual — sem isso, mutações feitas depois de
  // trocar de kanban acabavam recarregando o kanban errado (o primeiro da
  // lista, valor de activeBoardId "congelado" na closure da load() memoizada).
  async function refreshCurrentBoard(): Promise<void> {
    if (!activeBoardId) return;
    const result = await getBoardById(activeBoardId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setBoard(result.data);
    // Mantém a linha da lista (nome/ícone/cor) em sincronia sem precisar
    // recarregar a lista inteira — cobre a aba Layout mudando ícone/cor.
    setBoards((prev) =>
      prev.map((b) =>
        b.id === activeBoardId
          ? {
              ...b,
              name: result.data.name,
              icon: result.data.icon,
              color: result.data.color,
            }
          : b,
      ),
    );
  }

  function updateBoardOptimistic(updater: (b: Board) => Board): void {
    setBoard((prev) => (prev ? updater(prev) : prev));
  }

  return {
    boards,
    activeBoardId,
    board,
    loading,
    openBoard,
    handleNewBoard,
    handleDeleteBoard,
    refreshCurrentBoard,
    updateBoardOptimistic,
  };
}
