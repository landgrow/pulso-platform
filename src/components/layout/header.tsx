"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/layout/sidebar-context";
import { NavCollapseButton } from "@/components/layout/nav-collapse";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserDropdown } from "@/components/layout/user-dropdown";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps): JSX.Element {
  const { openMobile, isCollapsed, toggle } = useSidebar();

  return (
    <header className="h-16 px-4 flex items-center gap-4 bg-surface-1 border-b border-border shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0"
        onClick={openMobile}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="hidden lg:flex shrink-0">
        <NavCollapseButton collapsed={isCollapsed} onToggle={toggle} />
      </div>

      {/* Org switcher (esquerda) */}
      <div className="hidden lg:flex flex-1">
        <OrgSwitcher />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto">
        <ThemeToggle />
        <UserDropdown user={user} />
      </div>
    </header>
  );
}
