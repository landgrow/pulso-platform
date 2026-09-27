import type { StaffCapabilityId } from "@/lib/auth/staff-access";

export type NavVisibility = "all" | "client" | StaffCapabilityId;

export type NavGroup = "mesa" | "trabalho" | "carteira" | "sistema";

export interface HqNavItem {
  href: string;
  label: string;
  short: string;
  icon: string;
  visibility?: NavVisibility;
  group: NavGroup;
}

export const HQ_NAV: HqNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    short: "Mesa",
    icon: "layout-dashboard",
    group: "mesa",
  },
  {
    href: "/bin",
    label: "BIN",
    short: "BIN",
    icon: "radar",
    visibility: "client",
    group: "trabalho",
  },
  {
    href: "/admin/painel",
    label: "Painel",
    short: "Prazo",
    icon: "home",
    visibility: "painel",
    group: "mesa",
  },
  {
    href: "/admin/atividades",
    label: "Atividades",
    short: "Fazer",
    icon: "clipboard-list",
    visibility: "atividades",
    group: "trabalho",
  },
  {
    href: "/admin/mapa-mental",
    label: "Mapa Mental",
    short: "Mapa",
    icon: "share-2",
    visibility: "mapa_mental",
    group: "trabalho",
  },
  {
    href: "/admin/financeiro",
    label: "Financeiro",
    short: "Caixa",
    icon: "wallet",
    visibility: "financeiro",
    group: "mesa",
  },
  {
    href: "/admin/crm",
    label: "CRM",
    short: "CRM",
    icon: "contact",
    visibility: "crm",
    group: "trabalho",
  },
  {
    href: "/admin/clientes",
    label: "Organizações",
    short: "Orgs",
    icon: "building-2",
    visibility: "clientes",
    group: "carteira",
  },
  {
    href: "/admin/bin",
    label: "BIN",
    short: "BIN",
    icon: "radar",
    visibility: "bin",
    group: "carteira",
  },
  {
    href: "/admin/equipe",
    label: "Equipe",
    short: "Time",
    icon: "users",
    visibility: "equipe",
    group: "sistema",
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    short: "Ajuste",
    icon: "settings",
    group: "sistema",
  },
];

export const NAV_GROUP_LABEL: Record<NavGroup, string> = {
  mesa: "Mesa",
  trabalho: "Trabalho",
  carteira: "Carteira",
  sistema: "Sistema",
};

export const COMMAND_OPEN_EVENT = "pulso:command";

export function requestCommandPalette(): void {
  window.dispatchEvent(new Event(COMMAND_OPEN_EVENT));
}

export function filterHqNav(
  items: HqNavItem[],
  opts: {
    capabilities: StaffCapabilityId[];
    inClientWorkspace: boolean;
    onHqRoute: boolean;
    platformRole: "platform_admin" | "consultant" | null;
  },
): HqNavItem[] {
  return items.filter((item) => {
    if (!item.visibility || item.visibility === "all") return true;
    if (item.visibility === "client") {
      return opts.inClientWorkspace && !opts.onHqRoute;
    }
    if (
      opts.inClientWorkspace &&
      opts.platformRole !== null &&
      !opts.onHqRoute
    ) {
      return false;
    }
    return opts.capabilities.includes(item.visibility);
  });
}
