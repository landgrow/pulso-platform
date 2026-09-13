import { randomUUID } from "crypto";
import type { MindMapLayout, MindMapNode } from "@/types/mindmaps";

const MM_COLORS = [
  "#3b82f6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
];

function mmNode(text: string, color: string): MindMapNode {
  return { id: randomUUID(), text, color, children: [] };
}

function columnsOrGrid(
  title: string,
  layout: MindMapLayout,
  blocos: [string, string[]][],
): { tree: MindMapNode; layout: MindMapLayout } {
  const root = mmNode(title, "#27272a");
  blocos.forEach(([label, subs], i) => {
    const n = mmNode(label, MM_COLORS[i % MM_COLORS.length] ?? "#3b82f6");
    subs.forEach((s) => n.children.push(mmNode(s, n.color)));
    root.children.push(n);
  });
  return { tree: root, layout };
}

/** Porta mmBuildTemplate() do protótipo (kanban.html) — mesmos 8 templates, mesma estrutura. */
export function buildMindMapTemplate(key: string): {
  tree: MindMapNode;
  layout: MindMapLayout;
} {
  switch (key) {
    case "retrospectiva":
      return columnsOrGrid("Retrospectiva", "columns", [
        ["O que funcionou", []],
        ["O que não funcionou", []],
        ["Ações pra melhorar", []],
      ]);
    case "scamper": {
      const root = mmNode("SCAMPER", "#27272a");
      const ramos = [
        "Substituir",
        "Combinar",
        "Adaptar",
        "Modificar",
        "Usar de outro jeito",
        "Eliminar",
        "Reverter",
      ];
      ramos.forEach((label, i) =>
        root.children.push(
          mmNode(label, MM_COLORS[i % MM_COLORS.length] ?? "#3b82f6"),
        ),
      );
      return { tree: root, layout: "columns" };
    }
    case "canva":
      return columnsOrGrid("Canva", "canvas-grid", [
        ["Proposta de Valor", []],
        ["Segmentos de Clientes", []],
        ["Canais", []],
        ["Fontes de Receita", ["Recorrência", "Serviços avulsos"]],
        ["Estrutura de Custos", ["Fixos", "Variáveis"]],
      ]);
    case "escopo-projeto":
      return columnsOrGrid("Escopo de Projeto", "canvas-grid", [
        ["Objetivos", []],
        ["Entregáveis", []],
        ["Fora do escopo", []],
        ["Prazo", ["Marco 1", "Marco 2", "Marco 3"]],
        ["Restrições", []],
      ]);
    case "plano-comunicacao":
      return columnsOrGrid("Plano de Comunicação", "columns", [
        ["Público", []],
        ["Mensagem", []],
        ["Canal", []],
        ["Frequência", []],
      ]);
    case "swot": {
      const root = mmNode("Análise SWOT", "#27272a");
      root.children.push(mmNode("Forças", "#16A34A"));
      root.children.push(mmNode("Fraquezas", "#EF4444"));
      root.children.push(mmNode("Oportunidades", "#3B82F6"));
      root.children.push(mmNode("Ameaças", "#F59E0B"));
      return { tree: root, layout: "quadrant" };
    }
    case "matriz-decisao": {
      const root = mmNode("Matriz de Decisão", "#27272a");
      root.children.push(mmNode("Urgente e Importante", "#EF4444"));
      root.children.push(mmNode("Importante, não urgente", "#3B82F6"));
      root.children.push(mmNode("Urgente, não importante", "#F59E0B"));
      root.children.push(mmNode("Nem urgente, nem importante", "#94A3B8"));
      return { tree: root, layout: "quadrant" };
    }
    case "em-branco":
    default:
      return columnsOrGrid("Novo mapa", "columns", [
        ["Nova coluna", ["Item de exemplo"]],
      ]);
  }
}
