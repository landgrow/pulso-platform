"use client";

import { useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapsibleSubnav } from "@/components/layout/nav-collapse";

export function BoardListRow({
  name,
  active,
  marker,
  onSelect,
  onRename,
  onDelete,
}: {
  name: string;
  active: boolean;
  marker: ReactNode;
  onSelect: () => void;
  onRename?: (name: string) => Promise<boolean>;
  onDelete?: () => void;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  async function commit(next: string): Promise<void> {
    const trimmed = next.trim();
    if (!trimmed || trimmed === name) {
      setDraft(name);
      setEditing(false);
      return;
    }
    const ok = onRename ? await onRename(trimmed) : false;
    if (!ok) setDraft(name);
    setEditing(false);
  }

  return (
    <div className="group flex items-center">
      {editing ? (
        <input
          autoFocus
          aria-label="Nome da lista"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commit(draft);
            }
            if (event.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          onBlur={() => void commit(draft)}
          className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface-1 px-2 text-sm text-text-1 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      ) : (
        <button
          onClick={onSelect}
          onDoubleClick={() => {
            if (!onRename) return;
            setDraft(name);
            setEditing(true);
          }}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
            active
              ? "bg-primary/10 font-medium text-primary"
              : "text-text-2 hover:bg-surface-2 hover:text-text-1",
          )}
        >
          {marker}
          <span className="truncate">{name}</span>
        </button>
      )}
      {onRename && !editing && (
        <button
          type="button"
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
          className={cn(
            "shrink-0 p-1 text-text-2 hover:text-text-1",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          aria-label={`Renomear ${name}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {onDelete && !editing && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 p-1 text-text-2 hover:text-error opacity-0 group-hover:opacity-100"
          aria-label="Excluir"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

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
  onRename,
  collapseKey,
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
  onRename?: (id: string, name: string) => Promise<boolean>;
  collapseKey?: string;
  className?: string;
}): JSX.Element {
  return (
    <CollapsibleSubnav
      storageKey={collapseKey ?? `pulso-nav-${sectionLabel}`}
      className={className}
    >
      <aside className="flex h-full flex-col border-r border-border bg-surface-1">
        <div className="px-3 py-3 border-b border-border">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-text-2">
            {title ?? sectionLabel}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {title && (
            <p className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-2">
              {sectionLabel}
            </p>
          )}
          <nav className="space-y-0.5">
            {items.map((item) => (
              <BoardListRow
                key={item.id}
                name={item.name}
                active={item.id === activeId}
                onSelect={() => onSelect(item.id)}
                onRename={
                  onRename ? (next) => onRename(item.id, next) : undefined
                }
                onDelete={
                  onDelete && item.id === activeId && items.length > 1
                    ? () => onDelete(item.id)
                    : undefined
                }
                marker={
                  item.icon ? (
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] leading-none"
                      style={{ background: item.color ?? "var(--text-faint)" }}
                    >
                      {item.icon}
                    </span>
                  ) : (
                    <span className="shrink-0">{icon}</span>
                  )
                }
              />
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
    </CollapsibleSubnav>
  );
}
