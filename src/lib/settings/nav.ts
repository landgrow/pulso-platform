export interface SettingsNavItem {
  href: string;
  label: string;
  description: string;
  group: "conta" | "trabalho" | "privacidade";
  staffOnly?: boolean;
  auditOnly?: boolean;
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    href: "/configuracoes/conta",
    label: "Conta",
    description: "Nome, senha e como você entra no PULSO.",
    group: "conta",
  },
  {
    href: "/configuracoes/aparencia",
    label: "Aparência",
    description: "Tema claro, escuro ou o do sistema.",
    group: "conta",
  },
  {
    href: "/configuracoes/integracoes",
    label: "Integrações",
    description: "Google e os conectores que ainda vão entrar.",
    group: "conta",
  },
  {
    href: "/configuracoes/notificacoes",
    label: "Notificações",
    description: "O que o PULSO pode avisar por e-mail.",
    group: "trabalho",
  },
  {
    href: "/configuracoes/operacao",
    label: "Operação",
    description: "Automações e campos padrão dos kanbans.",
    group: "trabalho",
    staffOnly: true,
  },
  {
    href: "/configuracoes/dados",
    label: "Privacidade",
    description: "Exportar seus dados (LGPD).",
    group: "privacidade",
  },
  {
    href: "/configuracoes/audit-log",
    label: "Histórico de ações",
    description: "Quem criou ou apagou o quê, e quando.",
    group: "privacidade",
    auditOnly: true,
  },
];

export function visibleSettingsNav(opts: {
  isStaff: boolean;
  canAudit: boolean;
}): SettingsNavItem[] {
  return SETTINGS_NAV.filter((item) => {
    if (item.staffOnly && !opts.isStaff) return false;
    if (item.auditOnly && !opts.canAudit) return false;
    return true;
  });
}
