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

export interface NavLink {
  href: string;
  label: string;
  short: string;
  icon: string;
}

/** Menu do portal do cliente — mesma ordem do protótipo (kanban.html). */
export function clientNav(slug: string): NavLink[] {
  const base = `/clientes/${slug}`;
  return [
    { href: base, label: "Painel", short: "Painel", icon: "home" },
    {
      href: `${base}/atividades`,
      label: "Atividades",
      short: "Tarefas",
      icon: "clipboard-list",
    },
    {
      href: `${base}/projeto`,
      label: "Projeto",
      short: "Projeto",
      icon: "share-2",
    },
    { href: `${base}/bin`, label: "BIN", short: "BIN", icon: "radar" },
    { href: `${base}/min`, label: "MIN", short: "MIN", icon: "briefcase" },
    {
      href: `${base}/metricas`,
      label: "Métricas",
      short: "Métricas",
      icon: "bar-chart",
    },
    {
      href: `${base}/coleta`,
      label: "Documentos",
      short: "Docs",
      icon: "folder",
    },
    {
      href: `${base}/central-ia`,
      label: "Central IA",
      short: "IA",
      icon: "sparkles",
    },
    {
      href: "/configuracoes",
      label: "Ajustes",
      short: "Ajustes",
      icon: "settings",
    },
  ];
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

/**
 * O que a sidebar mostra. Cliente: só o menu do portal. Equipe dentro do
 * espaço de um cliente ("Entrar como membro"): menu do portal + o do HQ.
 * Equipe no HQ: só o do HQ.
 */
export function buildNav(opts: {
  capabilities: StaffCapabilityId[];
  inClientWorkspace: boolean;
  onHqRoute: boolean;
  platformRole: "platform_admin" | "consultant" | null;
  clientSlug: string | null;
}): { client: NavLink[]; hq: NavLink[] } {
  const client = opts.clientSlug ? clientNav(opts.clientSlug) : [];
  if (opts.platformRole === null) {
    return {
      client:
        client.length > 0
          ? client
          : [
              {
                href: "/configuracoes",
                label: "Ajustes",
                short: "Ajustes",
                icon: "settings",
              },
            ],
      hq: [],
    };
  }
  const hq = filterHqNav(HQ_NAV, opts);
  return {
    client: opts.inClientWorkspace && !opts.onHqRoute ? client : [],
    hq,
  };
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
    // Cliente de verdade (sem platform role) só vê os itens "client"/"all"
    // acima. Equipe Land Grow (platform_admin/consultant) sempre vê o menu
    // completo por capability, mesmo dentro do workspace de um cliente —
    // esconder tudo nesse caso deixava a própria equipe sem menu ao entrar
    // na página real de um cliente (ex: /clientes/[slug]/bin).
    if (opts.platformRole === null) return false;
    return opts.capabilities.includes(item.visibility);
  });
}
