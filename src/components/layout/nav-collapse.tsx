"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, PanelLeft, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function usePersistedCollapsed(
  storageKey: string,
  defaultCollapsed = false,
): {
  collapsed: boolean;
  toggle: () => void;
} {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggle(): void {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      }
      return next;
    });
  }

  return { collapsed, toggle };
}

/** Ícone só — sem texto. Tooltip carrega o significado (padrão ClickUp). */
export function NavCollapseButton({
  collapsed,
  onToggle,
  expandLabel = "Mostrar menu",
  collapseLabel = "Recolher menu",
  className,
}: {
  collapsed: boolean;
  onToggle: () => void;
  expandLabel?: string;
  collapseLabel?: string;
  className?: string;
}): JSX.Element {
  const Icon = collapsed ? PanelLeftOpen : PanelLeft;
  const label = collapsed ? expandLabel : collapseLabel;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-text-2 hover:bg-surface-2 hover:text-text-1",
        className,
      )}
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/**
 * Submenu de tela no padrão ClickUp:
 * aberto = lista completa + pílula na costura (sem faixa de texto);
 * fechado = some de vez; só um ícone 32px no fluxo, sem coluna "MENU".
 */
export function CollapsibleSubnav({
  storageKey,
  children,
  className,
}: {
  storageKey: string;
  children: ReactNode;
  className?: string | undefined;
}): JSX.Element {
  const { collapsed, toggle } = usePersistedCollapsed(storageKey);

  if (collapsed) {
    return (
      <NavCollapseButton
        collapsed
        onToggle={toggle}
        className={cn("mt-1 shrink-0 self-start", className)}
      />
    );
  }

  return (
    <div className={cn("relative w-56 shrink-0 self-stretch", className)}>
      {children}
      <button
        type="button"
        onClick={toggle}
        className="absolute top-3 -right-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-1 text-text-2 shadow-sm hover:bg-surface-2 hover:text-text-1"
        title="Recolher menu"
        aria-label="Recolher menu"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
