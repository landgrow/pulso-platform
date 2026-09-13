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
  ClipboardList,
  Share2,
  Contact,
  Home,
  BarChart3,
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
  "clipboard-list": ClipboardList,
  "share-2": Share2,
  contact: Contact,
  home: Home,
  "bar-chart-3": BarChart3,
};

interface NavItem {
  href: string;
  label: string;
  icon: string;
  /**
   * "all" = qualquer usuário logado; "admin" = só platform_admin;
   * "admin_or_consultant" = os dois; "client" = só quem NÃO é platform_admin
   * nem consultant (organizações-cliente de verdade — Coleções/Programa/Meus
   * dados são ferramentas do cliente, não fazem sentido no menu do admin).
   */
  visibility?: "all" | "admin" | "admin_or_consultant" | "client";
}

// Um menu só, sem divisão visual — filtrado por platformRole (ver
// `visibility` de cada item). BIN e MIN não entram aqui — acessados por outro
// caminho (ver Painel). Central IA saiu do menu (ainda é só placeholder).
const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
  {
    href: "/colecoes",
    label: "Coleções",
    icon: "layers",
    visibility: "client",
  },
  {
    href: "/programa",
    label: "Programa",
    icon: "target",
    visibility: "client",
  },
  { href: "/admin/painel", label: "Painel", icon: "home", visibility: "admin" },
  {
    href: "/admin/atividades",
    label: "Atividades",
    icon: "clipboard-list",
    visibility: "admin",
  },
  {
    href: "/admin/mapa-mental",
    label: "Mapa Mental",
    icon: "share-2",
    visibility: "admin",
  },
  {
    href: "/admin/metricas",
    label: "Métricas",
    icon: "bar-chart-3",
    visibility: "admin",
  },
  { href: "/admin/crm", label: "CRM", icon: "contact", visibility: "admin" },
  {
    href: "/admin/clientes",
    label: "Organizações",
    icon: "building-2",
    visibility: "admin_or_consultant",
  },
  {
    href: "/admin/acessos",
    label: "Acessos",
    icon: "user-plus",
    visibility: "admin",
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
    label: "Meus dados",
    icon: "file-json",
    visibility: "client",
  },
  {
    href: "/configuracoes/audit-log",
    label: "Audit Log",
    icon: "activity",
    visibility: "admin",
  },
];

export function Sidebar({
  variant = "rail",
}: {
  variant?: "rail" | "full";
}): JSX.Element {
  const pathname = usePathname();
  const { isMobileOpen, onMobileClose } = useSidebar();
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

  const visibleItems = navItems.filter((item) => {
    if (!item.visibility || item.visibility === "all") return true;
    if (item.visibility === "admin") return platformRole === "platform_admin";
    if (item.visibility === "client") return platformRole === null;
    return platformRole === "platform_admin" || platformRole === "consultant";
  });

  const isFull = variant === "full";

  const className = cn(
    "flex flex-col h-full bg-surface-1 border-r border-border",
    isFull ? "w-full" : "w-20",
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
            "flex items-center h-16 border-b border-border shrink-0",
            isFull ? "gap-2 px-4" : "justify-center",
          )}
        >
          <div className="h-8 w-8 rounded-lg bg-brand-lime flex items-center justify-center shrink-0">
            <span className="text-brand-lime-foreground font-bold text-sm">
              LG
            </span>
          </div>
          {isFull && (
            <span className="text-lg font-semibold text-text-1 tracking-tight">
              {APP_NAME}
            </span>
          )}
        </div>

        {/* Rail compacto (ícone + rótulo pequeno embaixo) no desktop — lista cheia no drawer mobile */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto space-y-1",
            isFull ? "py-4 px-2" : "py-3 px-1.5",
          )}
          aria-label={APP_NAME}
        >
          {visibleItems.map((item) => {
            const Icon = iconMap[item.icon] ?? LayoutDashboard;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                title={isFull ? undefined : item.label}
              >
                <span
                  className={cn(
                    "transition-colors duration-150 rounded-lg",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-text-2 hover:bg-surface-2 hover:text-text-1",
                    isFull
                      ? "flex items-center gap-3 px-3 py-2.5 text-sm font-medium"
                      : "flex flex-col items-center justify-center gap-1 py-2 px-1 text-center",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span
                    className={
                      isFull
                        ? undefined
                        : "text-[10px] leading-[1.15] line-clamp-2 break-words w-full"
                    }
                  >
                    {item.label}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
