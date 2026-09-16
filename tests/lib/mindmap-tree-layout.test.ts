import { describe, expect, it } from "vitest";
import {
  applyBranchDelta,
  collectSubtreeIds,
  layoutMindTree,
  mindEdgePath,
  offsetLaidBranch,
} from "@/lib/mindmaps/tree-layout";
import {
  buildMindMapTemplate,
  isLegacyBlankColumnMap,
  shouldUseRadialTree,
  upgradeLegacyBlankToRadial,
} from "@/lib/mindmap-templates";
import type { MindMapNode } from "@/types/mindmaps";

function node(
  text: string,
  color: string,
  children: MindMapNode[] = [],
): MindMapNode {
  return { id: text, text, color, children };
}

describe("mind map templates", () => {
  it("blank map is a radial tree with only the central topic", () => {
    const { tree, layout } = buildMindMapTemplate("em-branco");
    expect(layout).toBe("radial");
    expect(tree.text).toBe("Novo Projeto");
    expect(tree.children).toHaveLength(0);
  });

  it("SCAMPER stays a radial tree of branches, not columns", () => {
    const { tree, layout } = buildMindMapTemplate("scamper");
    expect(layout).toBe("radial");
    expect(tree.children).toHaveLength(7);
  });

  it("SWOT stays a structured quadrant", () => {
    const { layout, tree } = buildMindMapTemplate("swot");
    expect(layout).toBe("quadrant");
    expect(tree.children).toHaveLength(4);
  });

  it("upgrades the old dummy column blank into a radial tree", () => {
    const tree = node("Meu mapa", "#27272a", [
      node("Nova coluna", "#3b82f6", [node("Item de exemplo", "#3b82f6")]),
    ]);
    expect(isLegacyBlankColumnMap("columns", tree)).toBe(true);
    expect(
      isLegacyBlankColumnMap(
        "columns",
        buildMindMapTemplate("retrospectiva").tree,
      ),
    ).toBe(false);
    expect(upgradeLegacyBlankToRadial(tree).children).toHaveLength(0);
  });

  it("turns old admin column maps into the preview tree, keeping real topics", () => {
    const tree = node("Meu mapa", "#27272a", [
      node("Frente comercial", "#3b82f6", [node("ICP", "#3b82f6")]),
      node("Operação", "#10b981"),
    ]);
    expect(shouldUseRadialTree("columns", tree)).toBe(true);
    expect(
      shouldUseRadialTree(
        "columns",
        buildMindMapTemplate("retrospectiva").tree,
      ),
    ).toBe(false);
    expect(
      shouldUseRadialTree("quadrant", buildMindMapTemplate("swot").tree),
    ).toBe(false);
    expect(
      shouldUseRadialTree("radial", buildMindMapTemplate("scamper").tree),
    ).toBe(true);
  });
});

describe("radial tree layout", () => {
  it("places the root and splits children left and right", () => {
    const tree = node("Raiz", "#27272a", [
      node("Direita A", "#3B82F6"),
      node("Esquerda A", "#A78BFA"),
      node("Direita B", "#16A34A"),
    ]);
    const laid = layoutMindTree(tree);
    const root = laid.nodes.find((n) => n.depth === 0);
    const right = laid.nodes.filter((n) => n.side === 1);
    const left = laid.nodes.filter((n) => n.side === -1);
    expect(root).toBeDefined();
    expect(right.map((n) => n.text)).toEqual(["Direita A", "Direita B"]);
    expect(left.map((n) => n.text)).toEqual(["Esquerda A"]);
    expect(laid.edges).toHaveLength(3);
    expect(right.every((n) => n.x > (root?.x ?? 0))).toBe(true);
    expect(left.every((n) => n.x < (root?.x ?? 0))).toBe(true);
  });

  it("builds a cubic path that starts at the parent", () => {
    const d = mindEdgePath({
      fromId: "a",
      toId: "b",
      color: "#000",
      x1: 0,
      y1: 10,
      x2: 100,
      y2: 40,
    });
    expect(d.startsWith("M 0 10 C")).toBe(true);
  });

  it("attaches a left child to the parent left edge even after custom pos", () => {
    const tree = node("Raiz", "#27272a", [
      node("Direita", "#3B82F6"),
      node("Esquerda", "#A78BFA"),
    ]);
    const laid = layoutMindTree(tree);
    const root = laid.nodes.find((n) => n.depth === 0);
    const left = laid.nodes.find((n) => n.text === "Esquerda");
    const edge = laid.edges.find((e) => e.toId === left?.id);
    expect(root).toBeDefined();
    expect(left).toBeDefined();
    expect(edge?.x1).toBe(root?.x);
    expect(edge?.x2).toBe((left?.x ?? 0) + (left?.w ?? 0));
  });

  it("collects the topic and its descendants, not siblings", () => {
    const tree = node("Raiz", "#27272a", [
      node("A", "#3B82F6", [node("A1", "#3B82F6")]),
      node("B", "#A78BFA"),
    ]);
    expect(collectSubtreeIds(tree, "A").sort()).toEqual(["A", "A1"]);
    expect(collectSubtreeIds(tree, "B")).toEqual(["B"]);
  });

  it("offsets a branch while siblings stay put", () => {
    const tree = node("Raiz", "#27272a", [
      node("A", "#3B82F6", [node("A1", "#3B82F6")]),
      node("B", "#A78BFA"),
    ]);
    const laid = layoutMindTree(tree);
    const ids = new Set(collectSubtreeIds(tree, "A"));
    const next = offsetLaidBranch(laid, ids, 0, 40);
    const origA = laid.nodes.find((n) => n.id === "A");
    const origB = laid.nodes.find((n) => n.id === "B");
    const origA1 = laid.nodes.find((n) => n.id === "A1");
    expect(next.nodes.find((n) => n.id === "A")?.y).toBe((origA?.y ?? 0) + 40);
    expect(next.nodes.find((n) => n.id === "A1")?.y).toBe(
      (origA1?.y ?? 0) + 40,
    );
    expect(next.nodes.find((n) => n.id === "B")?.y).toBe(origB?.y);
  });

  it("persists pos on the dragged branch so layout keeps the alignment", () => {
    const tree = node("Raiz", "#27272a", [
      node("A", "#3B82F6", [node("A1", "#3B82F6")]),
      node("B", "#A78BFA"),
    ]);
    const laid = layoutMindTree(tree);
    applyBranchDelta(tree, laid, new Set(collectSubtreeIds(tree, "A")), 12, -8);
    const a = tree.children.find((c) => c.id === "A");
    const b = tree.children.find((c) => c.id === "B");
    expect(a?.pos).toEqual({
      x: (laid.nodes.find((n) => n.id === "A")?.x ?? 0) + 12,
      y: (laid.nodes.find((n) => n.id === "A")?.y ?? 0) - 8,
    });
    expect(a?.children[0]?.pos).toEqual({
      x: (laid.nodes.find((n) => n.id === "A1")?.x ?? 0) + 12,
      y: (laid.nodes.find((n) => n.id === "A1")?.y ?? 0) - 8,
    });
    expect(b?.pos).toBeUndefined();
    const relaid = layoutMindTree(tree);
    expect(relaid.nodes.find((n) => n.id === "A")?.x).toBe(a?.pos?.x);
    expect(relaid.nodes.find((n) => n.id === "B")?.x).toBe(
      laid.nodes.find((n) => n.id === "B")?.x,
    );
  });
});
