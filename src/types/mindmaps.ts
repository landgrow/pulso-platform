export interface MindMapNode {
  id: string;
  text: string;
  color: string;
  children: MindMapNode[];
  collapsed?: boolean;
  pos?: { x: number; y: number };
}

export interface MindMapSummary {
  id: string;
  name: string;
  updated_at: string;
}

/** radial = árvore com setas (preview / MindMeister). Os outros 3 são os templates estruturados. */
export type MindMapLayout = "radial" | "columns" | "quadrant" | "canvas-grid";

export const STRUCTURED_LAYOUTS: MindMapLayout[] = [
  "columns",
  "quadrant",
  "canvas-grid",
];

export function isStructuredLayout(layout: MindMapLayout): boolean {
  return STRUCTURED_LAYOUTS.includes(layout);
}

export interface MindMap {
  id: string;
  org_id: string;
  name: string;
  tree: MindMapNode;
  layout: MindMapLayout;
}

export interface MindMapTemplate {
  key: string;
  icon: string;
  title: string;
  desc: string;
}

/** Mesma lista de templates do protótipo (MM_TEMPLATES) — "em-branco" é a árvore radial. */
export const MIND_MAP_TEMPLATES: MindMapTemplate[] = [
  {
    key: "em-branco",
    icon: "📄",
    title: "Em branco",
    desc: "Só o tema central. Ramifique com o +.",
  },
  {
    key: "scamper",
    icon: "🧩",
    title: "SCAMPER",
    desc: "Técnica de ideação: 7 formas de repensar algo.",
  },
  {
    key: "retrospectiva",
    icon: "🔁",
    title: "Retrospectiva",
    desc: "O que funcionou, o que não funcionou, ações.",
  },
  {
    key: "plano-comunicacao",
    icon: "📣",
    title: "Plano de Comunicação",
    desc: "Público, mensagem, canal, frequência.",
  },
  {
    key: "canva",
    icon: "💼",
    title: "Canva",
    desc: "Proposta de valor, clientes, receita, custos...",
  },
  {
    key: "escopo-projeto",
    icon: "🗂️",
    title: "Escopo de Projeto",
    desc: "Objetivos, entregáveis, prazo, restrições.",
  },
  {
    key: "swot",
    icon: "🧭",
    title: "Análise SWOT",
    desc: "Forças, fraquezas, oportunidades e ameaças.",
  },
  {
    key: "matriz-decisao",
    icon: "🎯",
    title: "Matriz de Decisão",
    desc: "Urgente x importante: o que priorizar.",
  },
];
