"use client";

import { useEffect, useState, type ReactNode } from "react";
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

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrates from localStorage, unavailable during SSR
      if (stored === "1") setCollapsed(true);
      if (stored === "0") setCollapsed(false);
    } catch {
      /* ignore quota / private mode */
    }
  }, [storageKey]);

  function toggle(): void {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* ignore quota / private mode */
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

function useNarrow(query = "(max-width: 1023px)"): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const apply = (): void => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [query]);

  return narrow;
}

/**
 * Submenu de tela no padrão ClickUp:
 * desktop aberto = coluna 224px; fechado = só ícone 32px.
 * abaixo de lg = overlay, para não esmagar o conteúdo.
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
  const narrow = useNarrow();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closes mobile drawer when viewport crosses into narrow
    if (narrow) setMobileOpen(false);
  }, [narrow]);

  const open = narrow ? mobileOpen : !collapsed;

  function handleToggle(): void {
    if (narrow) setMobileOpen((prev) => !prev);
    else toggle();
  }

  if (!open) {
    return (
      <NavCollapseButton
        collapsed
        onToggle={handleToggle}
        className={cn("mt-1 shrink-0 self-start", className)}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        aria-label="Fechar menu"
        onClick={handleToggle}
      />
      <div
        className={cn(
          "relative w-56 shrink-0 self-stretch",
          "max-lg:fixed max-lg:top-12 max-lg:bottom-0 max-lg:left-0 max-lg:z-40 max-lg:overflow-y-auto max-lg:bg-surface-1 max-lg:shadow-xl",
          className,
        )}
      >
        {children}
        <button
          type="button"
          onClick={handleToggle}
          className="absolute top-3 -right-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-1 text-text-2 shadow-sm hover:bg-surface-2 hover:text-text-1"
          title="Recolher menu"
          aria-label="Recolher menu"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
}
