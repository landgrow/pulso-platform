export const RESOURCE_STATUSES = ["pronto", "validando", "rascunho"] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

export const RESOURCE_AXES = [
  "mesa",
  "trabalho",
  "carteira",
  "sistema",
  "depois",
] as const;
export type ResourceAxis = (typeof RESOURCE_AXES)[number];

export const RESOURCE_SURFACES = ["hq", "cliente"] as const;
export type ResourceSurface = (typeof RESOURCE_SURFACES)[number];

export const RESOURCE_KINDS = ["produto", "interno"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const RESOURCE_STATUS_LABEL: Record<ResourceStatus, string> = {
  pronto: "Pronto",
  validando: "Validando",
  rascunho: "Rascunho",
};

export const RESOURCE_AXIS_LABEL: Record<ResourceAxis, string> = {
  mesa: "Mesa",
  trabalho: "Trabalho",
  carteira: "Carteira",
  sistema: "Sistema",
  depois: "Depois — não entra agora",
};

export interface PulsoResource {
  id: string;
  name: string;
  summary: string;
  axis: ResourceAxis;
  status: ResourceStatus;
  surfaces: ResourceSurface[];
  kind: ResourceKind;
  access: string;
  href: string | null;
}

export const RESOURCE_CATALOG: PulsoResource[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    summary:
      "Resumo do negócio na mesa da Land Grow. Um lugar só — sem repetir o menu.",
    axis: "mesa",
    status: "pronto",
    surfaces: ["hq"],
    kind: "interno",
    access: "Métricas ou Financeiro",
    href: "/dashboard",
  },
  {
    id: "painel",
    name: "Painel",
    summary: "Prazos e o que vence. Mesa da operação.",
    axis: "mesa",
    status: "pronto",
    surfaces: ["hq"],
    kind: "interno",
    access: "Painel",
    href: "/admin/painel",
  },
  {
    id: "financeiro",
    name: "Financeiro",
    summary:
      "Livro, semana, contratos, contas, notas e caixa. Só a equipe Land Grow vê — não vai para o menu do cliente.",
    axis: "mesa",
    status: "pronto",
    surfaces: ["hq"],
    kind: "interno",
    access: "Financeiro",
    href: "/admin/financeiro",
  },
  {
    id: "atividades",
    name: "Atividades",
    summary: "Kanban e cards do que fazer, na equipe e no portal.",
    axis: "trabalho",
    status: "pronto",
    surfaces: ["hq", "cliente"],
    kind: "produto",
    access: "Atividades",
    href: "/admin/atividades",
  },
  {
    id: "objetivos",
    name: "Objetivos",
    summary: "Metas e KRs ligados ao cliente.",
    axis: "trabalho",
    status: "pronto",
    surfaces: ["hq", "cliente"],
    kind: "produto",
    access: "Atividades",
    href: "/admin/objetivos",
  },
  {
    id: "reunioes",
    name: "Reuniões",
    summary: "Agenda, ata e o que sai da conversa.",
    axis: "trabalho",
    status: "pronto",
    surfaces: ["hq", "cliente"],
    kind: "produto",
    access: "Atividades",
    href: "/admin/reunioes",
  },
  {
    id: "sala",
    name: "Sala",
    summary:
      "Canais da equipe Land Grow. O cliente não entra — é a sala interna.",
    axis: "trabalho",
    status: "pronto",
    surfaces: ["hq"],
    kind: "interno",
    access: "Sala",
    href: "/admin/sala",
  },
  {
    id: "calendario",
    name: "Calendário",
    summary: "Agenda da equipe e do cliente, com feriados e convites.",
    axis: "trabalho",
    status: "pronto",
    surfaces: ["hq", "cliente"],
    kind: "produto",
    access: "Calendário",
    href: "/admin/calendario",
  },
  {
    id: "mapa_mental",
    name: "Mapa Mental",
    summary: "Árvore do projeto. Já existe; ainda mede se o cliente usa.",
    axis: "trabalho",
    status: "validando",
    surfaces: ["hq", "cliente"],
    kind: "produto",
    access: "Mapa Mental",
    href: "/admin/mapa-mental",
  },
  {
    id: "crm",
    name: "CRM",
    summary: "Carteira comercial da Land Grow. Não é o portal do cliente.",
    axis: "trabalho",
    status: "pronto",
    surfaces: ["hq"],
    kind: "interno",
    access: "CRM",
    href: "/admin/crm",
  },
  {
    id: "grafo_trabalho",
    name: "Grafo de trabalho",
    summary:
      "Reunião → tarefa → cliente → responsável. O que a reunião gera, amarrado — sem projeto genérico.",
    axis: "trabalho",
    status: "validando",
    surfaces: ["hq"],
    kind: "produto",
    access: "Atividades",
    href: "/admin/trabalho",
  },
  {
    id: "clientes",
    name: "Organizações",
    summary: "Ficha, contrato e time. Novo cliente e convite ficam aqui.",
    axis: "carteira",
    status: "pronto",
    surfaces: ["hq"],
    kind: "interno",
    access: "Organizações",
    href: "/admin/clientes",
  },
  {
    id: "bin",
    name: "BIN",
    summary:
      "Diagnóstico dos 10 setores. Cliente preenche; a equipe lê a nota do manual e as respostas.",
    axis: "carteira",
    status: "pronto",
    surfaces: ["hq", "cliente"],
    kind: "produto",
    access: "BIN",
    href: "/admin/bin",
  },
  {
    id: "min",
    name: "MIN",
    summary:
      "13 blocos do método. Tela existe; o módulo ainda não passou no filtro.",
    axis: "carteira",
    status: "validando",
    surfaces: ["hq", "cliente"],
    kind: "produto",
    access: "MIN",
    href: "/admin/min",
  },
  {
    id: "documentos",
    name: "Documentos",
    summary:
      "Drive de arquivos da empresa: HQ da Land Grow e portal de cada cliente.",
    axis: "trabalho",
    status: "pronto",
    surfaces: ["hq", "cliente"],
    kind: "produto",
    access: "Documentos",
    href: "/admin/documentos",
  },
  {
    id: "central_ia",
    name: "Central IA",
    summary:
      "Chat com o dossiê do PULSO (BIN, reunião, tarefa). Em prova com API gratuita (Groq).",
    axis: "carteira",
    status: "validando",
    surfaces: ["hq", "cliente"],
    kind: "produto",
    access: "Painel",
    href: "/admin/central-ia",
  },
  {
    id: "equipe",
    name: "Equipe",
    summary: "Quem é admin, quem é consultor, e quais funções cada um vê.",
    axis: "sistema",
    status: "pronto",
    surfaces: ["hq"],
    kind: "interno",
    access: "Equipe",
    href: "/admin/equipe",
  },
  {
    id: "recursos",
    name: "Catálogo de recursos",
    summary:
      "Inventário do que existe, do que está em prova e do que ainda é ideia. Planos comerciais só depois.",
    axis: "sistema",
    status: "validando",
    surfaces: ["hq"],
    kind: "interno",
    access: "Equipe",
    href: "/admin/recursos",
  },
  {
    id: "configuracoes",
    name: "Configurações",
    summary: "Conta, notificações e conectores.",
    axis: "sistema",
    status: "pronto",
    surfaces: ["hq", "cliente"],
    kind: "interno",
    access: "Qualquer usuário logado",
    href: "/configuracoes",
  },
  {
    id: "metricas",
    name: "Métricas",
    summary: "Leitura do negócio no Dashboard. Não é um segundo Financeiro.",
    axis: "sistema",
    status: "pronto",
    surfaces: ["hq"],
    kind: "interno",
    access: "Métricas",
    href: "/dashboard",
  },
  {
    id: "planos",
    name: "Planos comerciais",
    summary:
      "Três faixas que liberam o que passou no filtro. Não montar agora — senão vende o que ainda não está pronto.",
    axis: "depois",
    status: "rascunho",
    surfaces: ["hq", "cliente"],
    kind: "produto",
    access: "Ainda sem chave",
    href: null,
  },
  {
    id: "acesso_por_recurso",
    name: "Acesso por recurso novo",
    summary:
      "Marketing não vê caixa. Vale para o que ainda vai nascer. O Financeiro atual não se redesenha.",
    axis: "depois",
    status: "rascunho",
    surfaces: ["hq"],
    kind: "interno",
    access: "Equipe",
    href: null,
  },
  {
    id: "programa",
    name: "Programa e tarefas",
    summary:
      "Épico 4: programa do cliente com acompanhamento. Ainda não tem tela.",
    axis: "depois",
    status: "rascunho",
    surfaces: ["hq", "cliente"],
    kind: "produto",
    access: "Ainda sem chave",
    href: null,
  },
];

export function isResourceStatus(value: string): value is ResourceStatus {
  return (RESOURCE_STATUSES as readonly string[]).includes(value);
}

export function countByStatus(
  items: readonly PulsoResource[],
): Record<ResourceStatus, number> {
  return {
    pronto: items.filter((item) => item.status === "pronto").length,
    validando: items.filter((item) => item.status === "validando").length,
    rascunho: items.filter((item) => item.status === "rascunho").length,
  };
}

export function applyStatusOverrides(
  items: readonly PulsoResource[],
  overrides: Readonly<Record<string, ResourceStatus>>,
): PulsoResource[] {
  return items.map((item) => {
    const next = overrides[item.id];
    return next && next !== item.status ? { ...item, status: next } : item;
  });
}

export function canEnterPlan(item: PulsoResource): boolean {
  return item.kind === "produto" && item.status === "pronto";
}

export function surfaceLabel(surfaces: readonly ResourceSurface[]): string {
  const hq = surfaces.includes("hq");
  const client = surfaces.includes("cliente");
  if (hq && client) return "Land Grow e cliente";
  if (client) return "Cliente";
  return "Só Land Grow";
}
