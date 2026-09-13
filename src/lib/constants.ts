/**
 * Constantes globais do PULSO
 */

export const APP_NAME = "PULSO";
export const APP_TAGLINE = "Inteligência de negócios para PMEs";

export const SIDEBAR_WIDTH = {
  expanded: "16rem", // 256px
  collapsed: "4rem", // 64px
} as const;

export const HEADER_HEIGHT = "3.75rem"; // 60px

export const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "layout-dashboard",
  },
  {
    href: "/colecoes",
    label: "Coleções",
    icon: "layers",
  },
  {
    href: "/bin",
    label: "BIN",
    icon: "radar",
  },
  {
    href: "/programa",
    label: "Programa",
    icon: "target",
  },
] as const;

export const FOOTER_NAV = [
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: "settings",
  },
] as const;

/**
 * Cor por setor do BIN — mesma paleta do protótipo (kanban.html,
 * SETOR_DOT_COLORS) usada no badge de setor dos cards de Atividades.
 */
export const SETOR_COLORS: Record<string, string> = {
  Operacional: "#60A5FA",
  RH: "#A78BFA",
  Financeiro: "#34D399",
  Marketing: "#F472B6",
  Administrativo: "#FBBF24",
  Estratégico: "#22D3EE",
  Vendas: "#FB923C",
  Inovação: "#38BDF8",
  Jurídico: "#F87171",
  Liderança: "#C084FC",
};
