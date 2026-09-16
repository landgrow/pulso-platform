"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListSecondaryPanelItem {
  id: string;
  name: string;
  /** Emoji + cor do kanban (aba Layout > Ícone da base/Cor da capa) — quando presentes, substituem o `icon` genérico do painel. */
  icon?: string;
  color?: string;
}

/**
 * Coluna de navegação lateral, colada ao conteúdo — mesma linguagem visual
 * do sidebar do app (fundo/borda), listando os itens de uma seção (kanbans
 * de um board, mapas de um mapa mental). Espelha o painel secundário do
 * protótipo (public/preview/kanban.html, renderSecondaryPanel).
 */
export function ListSecondaryPanel({
  title,
  sectionLabel,
  items,
  activeId,
  icon,
  createLabel,
  onSelect,
  onCreate,
  onDelete,
  className,
}: {
  /** Opcional — a barra principal já mostra o módulo ativo, repetir o nome aqui é redundante. */
  title?: string;
  sectionLabel: string;
  items: ListSecondaryPanelItem[];
  activeId: string | null;
  icon: ReactNode;
  createLabel: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete?: (id: string) => void;
  className?: string;
}): JSX.Element {
  return (
    <aside
      className={cn(
        "flex h-full w-56 shrink-0 flex-col rounded-lg border border-border bg-surface-1",
        className,
      )}
    >
      {title && (
        <div className="px-4 py-3 border-b border-border">
          <p className="font-semibold text-sm">{title}</p>
        </div>
      )}
      <div className="flex-1 p-2">
        <p className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-2">
          {sectionLabel}
        </p>
        <nav className="space-y-0.5">
          {items.map((item) => (
            <div key={item.id} className="group flex items-center">
              <button
                onClick={() => onSelect(item.id)}
                className={cn(
                  "flex-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left min-w-0",
                  item.id === activeId
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-2 hover:bg-surface-2 hover:text-text-1",
                )}
              >
                {item.icon ? (
                  <span
                    className="shrink-0 h-5 w-5 rounded flex items-center justify-center text-[11px] leading-none"
                    style={{ background: item.color ?? "var(--text-faint)" }}
                  >
                    {item.icon}
                  </span>
                ) : (
                  <span className="shrink-0">{icon}</span>
                )}
                <span className="truncate">{item.name}</span>
              </button>
              {onDelete && item.id === activeId && items.length > 1 && (
                <button
                  onClick={() => onDelete(item.id)}
                  className="shrink-0 p-1 text-text-2 hover:text-error opacity-0 group-hover:opacity-100"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </nav>
      </div>
      <div className="p-2 border-t border-border">
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-text-2 hover:bg-surface-2 hover:text-text-1"
        >
          <Plus className="h-3.5 w-3.5" />
          {createLabel}
        </button>
      </div>
    </aside>
  );
}
