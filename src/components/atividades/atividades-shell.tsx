"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Upload,
  Zap,
  Lock,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useBoardList } from "@/hooks/use-board-list";
import { BoardContent } from "@/components/boards/board-content";
import { AtividadesDashboard } from "@/components/atividades/atividades-dashboard";
import { MeetingsPanel } from "@/components/atividades/meetings-panel";
import { ImportPanel } from "@/components/atividades/import-panel";
import { RitualsPanel } from "@/components/atividades/rituals-panel";
import { AutomationsPanel } from "@/components/atividades/automations-panel";
import { cn } from "@/lib/utils";
import { RITUAL_LABELS, type RitualTipo } from "@/types/rituals";

type Nav =
  | { kind: "dashboard" }
  | { kind: "meetings" }
  | { kind: "import" }
  | { kind: "board"; boardId: string }
  | { kind: "ritual"; tipo: RitualTipo }
  | { kind: "automations" };

const RITUAL_TIPOS: RitualTipo[] = ["standup", "weekly", "resultado"];

/** Shell completo de Atividades — painel secundário com submenu (Dashboard/Reuniões/Importar Dados, Plano de Ação, Rituais, Automações/Permissões), mesma estrutura do protótipo (SECONDARY_PANELS['gestor-tarefas']). */
export function AtividadesShell({ orgId }: { orgId: string }): JSX.Element {
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

  const [nav, setNav] = useState<Nav>({ kind: "board", boardId: "" });

  // Abre direto no Plano de Ação (kanban) assim que o primeiro board carrega — só na primeira vez.
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
    <div className="flex gap-4 items-start">
      <aside className="w-56 shrink-0 rounded-lg border border-border bg-surface-1 flex flex-col">
        <div className="flex-1 p-2 overflow-y-auto">
          <nav className="space-y-0.5">
            <NavButton
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboard"
              active={nav.kind === "dashboard"}
              onClick={() => setNav({ kind: "dashboard" })}
            />
            <NavButton
              icon={<Calendar className="h-4 w-4" />}
              label="Reuniões"
              active={nav.kind === "meetings"}
              onClick={() => setNav({ kind: "meetings" })}
            />
            <NavButton
              icon={<Upload className="h-4 w-4" />}
              label="Importar Dados"
              active={nav.kind === "import"}
              onClick={() => setNav({ kind: "import" })}
            />
          </nav>

          <div className="h-px bg-border my-2" />
          <p className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-2">
            Plano de Ação
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
                {boards.length > 1 &&
                  nav.kind === "board" &&
                  nav.boardId === b.id && (
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
          <p className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-2">
            Rituais
          </p>
          <nav className="space-y-0.5">
            {RITUAL_TIPOS.map((tipo) => (
              <NavButton
                key={tipo}
                icon={<Calendar className="h-4 w-4" />}
                label={RITUAL_LABELS[tipo]}
                active={nav.kind === "ritual" && nav.tipo === tipo}
                onClick={() => setNav({ kind: "ritual", tipo })}
              />
            ))}
          </nav>

          <div className="h-px bg-border my-2" />
          <nav className="space-y-0.5">
            <NavButton
              icon={<Zap className="h-4 w-4" />}
              label="Automações"
              active={nav.kind === "automations"}
              onClick={() => setNav({ kind: "automations" })}
            />
            <Link
              href="/admin/equipe"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-2 hover:bg-surface-2 hover:text-text-1"
            >
              <Lock className="h-4 w-4 shrink-0" />
              <span>Permissões</span>
            </Link>
          </nav>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {nav.kind === "dashboard" && <AtividadesDashboard orgId={orgId} />}
        {nav.kind === "meetings" && <MeetingsPanel orgId={orgId} />}
        {nav.kind === "import" && <ImportPanel boards={boards} />}
        {nav.kind === "automations" && <AutomationsPanel boards={boards} />}
        {nav.kind === "ritual" && (
          <RitualsPanel orgId={orgId} tipo={nav.tipo} />
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
          ) : (
            <p className="text-sm text-text-2">
              Não foi possível carregar o board.
            </p>
          ))}
      </div>
    </div>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-text-2 hover:bg-surface-2 hover:text-text-1",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
