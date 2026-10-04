"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getBoardById } from "@/app/actions/boards";
import { CardDetail } from "@/components/boards/board-content";
import { TaskModal } from "@/components/ui/task-modal";
import { cn, formatDate } from "@/lib/utils";
import type { Board } from "@/types/boards";

export interface PainelTask {
  id: string;
  boardId: string;
  titulo: string;
  boardName: string;
  prioridade: string;
  prazo: string | null;
  atrasada: boolean;
}

const PRIORIDADE_CLASS: Record<string, string> = {
  alta: "bg-error/10 text-error",
  media: "bg-warning/10 text-warning",
  baixa: "bg-surface-2 text-text-2",
};

const PRIORIDADE_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

/** Lista de tarefas do Painel: clicar abre o mesmo detalhe do kanban, ali mesmo. */
export function PainelTasks({ tasks }: { tasks: PainelTask[] }): JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState<{ cardId: string; board: Board } | null>(
    null,
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function openTask(task: PainelTask): Promise<void> {
    setLoadingId(task.id);
    const result = await getBoardById(task.boardId);
    setLoadingId(null);
    if (!result.success) {
      toast.error("Não consegui abrir a tarefa", { description: result.error });
      return;
    }
    setOpen({ cardId: task.id, board: result.data });
  }

  const refresh = useCallback(async (): Promise<void> => {
    if (!open) return;
    const result = await getBoardById(open.board.id);
    if (result.success) setOpen({ cardId: open.cardId, board: result.data });
    router.refresh();
  }, [open, router]);

  const close = useCallback((): void => {
    setOpen(null);
    router.refresh();
  }, [router]);

  const card = open?.board.cards.find((c) => c.id === open.cardId) ?? null;

  return (
    <>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-1">
        {tasks.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => void openTask(t)}
              disabled={loadingId !== null}
              className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none disabled:cursor-wait"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-text-1">
                {t.titulo}
              </span>
              <span className="text-xs text-text-3">{t.boardName}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  PRIORIDADE_CLASS[t.prioridade] ?? PRIORIDADE_CLASS.baixa,
                )}
              >
                {PRIORIDADE_LABEL[t.prioridade] ?? t.prioridade}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs tabular-nums",
                  t.atrasada ? "text-error" : "text-text-2",
                )}
              >
                {loadingId === t.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                )}
                {t.prazo ? formatDate(t.prazo) : "Sem prazo"}
                {t.atrasada ? " · atrasada" : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <TaskModal open={!!card} onClose={close}>
        {open && card ? (
          <CardDetail
            card={card}
            columns={open.board.columns}
            properties={open.board.properties}
            module={open.board.module}
            orgId={open.board.org_id}
            onChanged={() => void refresh()}
            onClose={close}
          />
        ) : null}
      </TaskModal>
    </>
  );
}
