"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Target,
  Settings,
  Building2,
  FileJson,
  Activity,
  UserPlus,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { getMyPlatformRole } from "@/app/actions/me";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  layers: Layers,
  target: Target,
  settings: Settings,
  "building-2": Building2,
  "file-json": FileJson,
  activity: Activity,
  "user-plus": UserPlus,
  users: Users,
};

interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** "all" = qualquer usuário logado; "admin" = só platform_admin; "admin_or_consultant" = os dois. */
  visibility?: "all" | "admin" | "admin_or_consultant";
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/colecoes", label: "Coleções", icon: "layers" },
  { href: "/programa", label: "Programa", icon: "target" },
];

const footerItems: NavItem[] = [
  {
    href: "/admin/acessos",
    label: "Acessos",
    icon: "user-plus",
    visibility: "admin",
  },
  {
    href: "/admin/clientes",
    label: "Organizações",
    icon: "building-2",
    visibility: "admin_or_consultant",
  },
  {
    href: "/admin/equipe",
    label: "Equipe",
    icon: "users",
    visibility: "admin",
  },
  { href: "/configuracoes", label: "Configurações", icon: "settings" },
  {
    href: "/configuracoes/dados",
    label: "Meus dados (LGPD)",
    icon: "file-json",
  },
  {
    href: "/configuracoes/audit-log",
    label: "Audit Log",
    icon: "activity",
    visibility: "admin",
  },
];

export function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const { isCollapsed, toggle, isMobileOpen, onMobileClose } = useSidebar();
  const [platformRole, setPlatformRole] = useState<
    "platform_admin" | "consultant" | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { role } = await getMyPlatformRole();
      if (!cancelled) setPlatformRole(role);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleFooterItems = footerItems.filter((item) => {
    if (!item.visibility || item.visibility === "all") return true;
    if (item.visibility === "admin") return platformRole === "platform_admin";
    return platformRole === "platform_admin" || platformRole === "consultant";
  });

  const className = cn(
    "flex flex-col h-full bg-surface-1 border-r border-border",
    "transition-all duration-300 ease-in-out",
    isCollapsed ? "w-16" : "w-64",
    isMobileOpen ? "block" : "hidden lg:flex",
  );

  return (
    <>
      {/* Overlay para mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside className={className} aria-label="Navegação principal">
        {/* Logo */}
        <div
          className={cn(
            "flex items-center h-16 px-4 border-b border-border shrink-0",
            isCollapsed ? "justify-center" : "gap-2",
          )}
        >
          <div className="h-8 w-8 rounded-lg bg-brand-lime flex items-center justify-center shrink-0">
            <span className="text-brand-lime-foreground font-bold text-sm">
              LG
            </span>
          </div>
          {!isCollapsed && (
            <span className="text-lg font-semibold text-text-1 tracking-tight">
              {APP_NAME}
            </span>
          )}
        </div>

        {/* Nav principal */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon] ?? LayoutDashboard;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link key={item.href} href={item.href} onClick={onMobileClose}>
                <span
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                    "transition-colors duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-text-2 hover:bg-surface-2 hover:text-text-1",
                    isCollapsed && "justify-center px-0",
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Nav de footer */}
        <div className="py-4 px-2 space-y-1 border-t border-border shrink-0">
          {visibleFooterItems.map((item) => {
            const Icon = iconMap[item.icon] ?? Settings;
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href} onClick={onMobileClose}>
                <span
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                    "transition-colors duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-text-2 hover:bg-surface-2 hover:text-text-1",
                    isCollapsed && "justify-center px-0",
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </span>
              </Link>
            );
          })}

          {/* Toggle de collapse (desktop) */}
          <button
            onClick={toggle}
            className={cn(
              "hidden lg:flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium",
              "text-text-2 hover:bg-surface-2 hover:text-text-1",
              "transition-colors duration-150 cursor-pointer",
              isCollapsed && "justify-center px-0",
            )}
            aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>Recolher</span>}
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
