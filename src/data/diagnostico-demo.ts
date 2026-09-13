/**
 * BIN e MIN — mesmos dados de exemplo do protótipo (kanban.html: BIN_SECTORS_DEMO,
 * MIN_BLOCKS). O motor real (63 perguntas por setor no BIN, preenchimento guiado
 * no MIN) é o Épico 2/3, ainda não construído — isso é só a visão geral do
 * progresso, igual ao protótipo.
 */
import { SETOR_COLORS } from "@/lib/constants";

export type DiagStatus = "nao-iniciado" | "andamento" | "concluido";

export function diagStatusKey(respondidas: number, total: number): DiagStatus {
  if (respondidas <= 0) return "nao-iniciado";
  if (respondidas >= total) return "concluido";
  return "andamento";
}

export const DIAG_STATUS_LABELS: Record<DiagStatus, string> = {
  "nao-iniciado": "Não iniciado",
  andamento: "Em andamento",
  concluido: "Concluído",
};

export interface BinSectorDemo {
  name: string;
  desc: string;
  total: number;
  respondidas: number;
}

export const BIN_SECTORS_DEMO: BinSectorDemo[] = [
  {
    name: "Operacional",
    desc: "Processos, rotinas e eficiência das entregas.",
    total: 7,
    respondidas: 7,
  },
  {
    name: "RH",
    desc: "Contratação, cultura e gestão de pessoas.",
    total: 6,
    respondidas: 6,
  },
  {
    name: "Financeiro",
    desc: "Fluxo de caixa, margem e saúde financeira.",
    total: 7,
    respondidas: 7,
  },
  {
    name: "Marketing",
    desc: "Posicionamento, canais e geração de demanda.",
    total: 6,
    respondidas: 2,
  },
  {
    name: "Administrativo",
    desc: "Rotinas, documentação e organização interna.",
    total: 6,
    respondidas: 6,
  },
  {
    name: "Estratégico",
    desc: "Metas, posicionamento e desdobramento de planos.",
    total: 6,
    respondidas: 6,
  },
  {
    name: "Vendas",
    desc: "Funil comercial, conversão e relacionamento com cliente.",
    total: 6,
    respondidas: 0,
  },
  {
    name: "Inovação",
    desc: "Novos produtos, processos e diferenciação.",
    total: 6,
    respondidas: 0,
  },
  {
    name: "Jurídico",
    desc: "Contratos, compliance e riscos legais.",
    total: 6,
    respondidas: 6,
  },
  {
    name: "Liderança",
    desc: "Tomada de decisão, delegação e visão de longo prazo.",
    total: 7,
    respondidas: 3,
  },
];

export function binSectorColor(name: string): string {
  return SETOR_COLORS[name] ?? "#3b82f6";
}

export const BIN_ENTREGAVEIS = [
  { nome: "RADAR", desc: "Scores e causas por setor." },
  { nome: "COMPASS", desc: "Síntese estratégica dos achados." },
  { nome: "HORIZON", desc: "Visão vs. capacidade atual da empresa." },
  { nome: "ROUTE PLANNER", desc: "Plano de ação com contexto completo." },
];

export interface MinBlockDemo {
  nome: string;
  total: number;
  respondidas: number;
  tags: string[];
  color: string;
}

export interface MinPhaseDemo {
  fase: string;
  blocos: MinBlockDemo[];
}

export const MIN_BLOCKS: MinPhaseDemo[] = [
  {
    fase: "Fundação & Validação",
    blocos: [
      {
        nome: "Proposta de Valor",
        total: 3,
        respondidas: 3,
        tags: ["Canvas", "Cliente"],
        color: "#3b82f6",
      },
      {
        nome: "Segmentos de Clientes",
        total: 3,
        respondidas: 3,
        tags: ["ICP", "Persona"],
        color: "#ec4899",
      },
      {
        nome: "Atividades-Chave",
        total: 4,
        respondidas: 4,
        tags: ["Operação"],
        color: "#10b981",
      },
      {
        nome: "Modelo de Receita",
        total: 3,
        respondidas: 3,
        tags: ["Financeiro"],
        color: "#f59e0b",
      },
      {
        nome: "Comportamento do Consumidor",
        total: 4,
        respondidas: 1,
        tags: ["Pesquisa"],
        color: "#8b5cf6",
      },
      {
        nome: "Jornada do Cliente",
        total: 3,
        respondidas: 3,
        tags: ["Experiência"],
        color: "#06b6d4",
      },
    ],
  },
  {
    fase: "Operação & Eficiência",
    blocos: [
      {
        nome: "Canais de Engajamento",
        total: 2,
        respondidas: 1,
        tags: ["Marketing"],
        color: "#14b8a6",
      },
      {
        nome: "Recursos Estratégicos",
        total: 3,
        respondidas: 0,
        tags: ["Time", "Infra"],
        color: "#64748b",
      },
      {
        nome: "Estrutura de Custos",
        total: 3,
        respondidas: 3,
        tags: ["Financeiro"],
        color: "#ef4444",
      },
    ],
  },
  {
    fase: "Consolidação & Governança",
    blocos: [
      {
        nome: "Ecossistema de Parceiros",
        total: 2,
        respondidas: 0,
        tags: ["Parcerias"],
        color: "#6366f1",
      },
      {
        nome: "Métricas de Impacto",
        total: 3,
        respondidas: 1,
        tags: ["KPI"],
        color: "#3b82f6",
      },
      {
        nome: "Cultura e Valores",
        total: 2,
        respondidas: 0,
        tags: ["Pessoas"],
        color: "#ec4899",
      },
      {
        nome: "Gestão de Riscos",
        total: 3,
        respondidas: 0,
        tags: ["Compliance"],
        color: "#f59e0b",
      },
    ],
  },
];
