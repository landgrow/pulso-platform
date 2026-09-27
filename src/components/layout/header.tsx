"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/layout/sidebar-context";

/** Só no mobile — no desktop o chrome vive na coluna do menu. */
export function Header(): JSX.Element {
  const { openMobile } = useSidebar();

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-border bg-surface-1 px-3 lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={openMobile}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </header>
  );
}
