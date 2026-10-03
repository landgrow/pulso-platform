"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Settings,
  Building2,
  Users,
  ClipboardList,
  Share2,
  Contact,
  Home,
  Wallet,
  Radar,
  Briefcase,
  BarChart3,
  Sparkles,
  FolderOpen,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { NavCollapseButton } from "@/components/layout/nav-collapse";
import { useSidebar } from "@/components/layout/sidebar-context";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserDropdown } from "@/components/layout/user-dropdown";
import { SidebarSignOut } from "@/components/layout/sidebar-signout";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { getMyPlatformRole } from "@/app/actions/me";
import type { StaffCapabilityId } from "@/lib/auth/staff-access";
import { buildNav, type NavLink } from "@/lib/nav/destinations";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  settings: Settings,
  "building-2": Building2,
  users: Users,
  "clipboard-list": ClipboardList,
  "share-2": Share2,
  contact: Contact,
  home: Home,
  wallet: Wallet,
  radar: Radar,
  briefcase: Briefcase,
  "bar-chart": BarChart3,
  sparkles: Sparkles,
  folder: FolderOpen,
};

/** Raiz do portal (/clientes/x) só fica ativa na própria página, não nas filhas. */
function isActiveLink(
  pathname: string,
  href: string,
  exactHrefs: Set<string>,
): boolean {
  if (exactHrefs.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  variant = "rail",
  user = null,
}: {
  variant?: "rail" | "full";
  user?: User | null;
}): JSX.Element {
  const pathname = usePathname();
  const { isCollapsed, toggle, onMobileClose } = useSidebar();
  const [platformRole, setPlatformRole] = useState<
    "platform_admin" | "consultant" | null
  >(null);
  const [capabilities, setCapabilities] = useState<StaffCapabilityId[]>([]);
  const [inClientWorkspace, setInClientWorkspace] = useState(false);
  const [clientSlug, setClientSlug] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        role,
        capabilities: nextCaps,
        inClientWorkspace: nextClient,
        clientSlug: nextSlug,
      } = await getMyPlatformRole();
      if (!cancelled) {
        setPlatformRole(role);
        setCapabilities(nextCaps);
        setInClientWorkspace(nextClient);
        setClientSlug(nextSlug);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // pathname: o seletor de org troca a org ativa e navega — relê o menu.
  }, [pathname]);

  const onHqRoute = pathname.startsWith("/admin");
  // Na URL /clientes/{slug}/… o slug da página manda (mesmo sem cookie).
  const urlSlug = /^\/clientes\/([^/]+)/.exec(pathname)?.[1] ?? null;
  const nav = buildNav({
    capabilities,
    inClientWorkspace: inClientWorkspace || urlSlug !== null,
    onHqRoute,
    platformRole,
    clientSlug: urlSlug ?? clientSlug,
  });
  const exactHrefs = new Set(nav.client.slice(0, 1).map((i) => i.href));
  const groups: { label: string | null; items: NavLink[] }[] = [
    {
      label: nav.hq.length > 0 && nav.client.length > 0 ? "Empresa" : null,
      items: nav.client,
    },
    {
      label: nav.client.length > 0 && nav.hq.length > 0 ? "Land Grow" : null,
      items: nav.hq,
    },
  ].filter((g) => g.items.length > 0 && (loaded || urlSlug !== null));

  const isFull = variant === "full" || !isCollapsed;

  const className = cn(
    "flex h-full flex-col border-r border-border bg-background",
    variant === "full"
      ? "w-full"
      : isFull
        ? "hidden w-56 lg:flex"
        : "hidden w-[4.5rem] lg:flex",
  );

  return (
    <aside className={className} aria-label="Navegação principal">
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-border",
          isFull ? "px-3 py-3" : "flex-col px-1.5 py-3",
        )}
      >
        <BrandMark />
        {isFull ? (
          <span className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-text-1">
            {APP_NAME}
          </span>
        ) : null}
        <OrgSwitcher compact={!isFull} />
        {variant === "rail" ? (
          <NavCollapseButton
            collapsed={!isFull}
            onToggle={toggle}
            className={isFull ? "ml-auto" : ""}
          />
        ) : null}
      </div>

      <nav
        className={cn(
          "flex-1 overflow-y-auto",
          isFull ? "space-y-0.5 px-2 py-3" : "flex flex-col items-stretch py-1",
        )}
        aria-label={APP_NAME}
      >
        {!loaded && groups.length === 0 ? (
          <div className="space-y-2 px-2 py-1" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-lg bg-surface-2"
              />
            ))}
          </div>
        ) : null}
        {groups.map((group, gi) => (
          <div
            key={group.label ?? gi}
            className={cn(gi > 0 && "mt-3 border-t border-border pt-3")}
          >
            {group.label && isFull ? (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-3">
                {group.label}
              </p>
            ) : null}
            {group.items.map((item) => {
              const Icon = iconMap[item.icon] ?? LayoutDashboard;
              const isActive = isActiveLink(pathname, item.href, exactHrefs);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  title={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center transition-colors duration-150",
                    isFull
                      ? cn(
                          "gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                          isActive
                            ? "bg-surface-2 text-text-1"
                            : "text-text-2 hover:bg-surface-2 hover:text-text-1",
                        )
                      : cn(
                          "flex-col gap-1 px-1 py-2.5",
                          isActive
                            ? "text-text-1"
                            : "text-text-3 hover:text-text-1",
                        ),
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {isFull ? (
                    <span className="truncate">{item.label}</span>
                  ) : (
                    <span className="text-[10px] font-medium leading-none tracking-wide">
                      {item.short}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-border",
          isFull
            ? "flex items-center gap-1 px-2 py-2"
            : "flex flex-col items-center gap-1 py-2",
        )}
      >
        <SidebarSignOut full={isFull} />
        <ThemeToggle placement="rail" />
        <UserDropdown user={user} placement="rail" />
      </div>
    </aside>
  );
}
