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
