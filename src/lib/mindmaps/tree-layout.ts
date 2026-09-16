import type { MindMapNode } from "@/types/mindmaps";

export const TREE_NODE_W = 210;
export const TREE_ROOT_W = 210;
export const TREE_NODE_H = 38;
export const TREE_ROOT_H = 44;
export const TREE_LEAF_H = 28;
export const TREE_LEVEL_GAP = 90;
export const TREE_LEAF_GAP = 46;
export const TREE_PAD = 56;
export const TREE_NODE_HALF_H = TREE_NODE_H / 2;

export type LaidNode = {
  id: string;
  text: string;
  color: string;
  depth: number;
  side: -1 | 0 | 1;
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed: boolean;
  hasChildren: boolean;
};

export type LaidEdge = {
  fromId: string;
  toId: string;
  color: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type TreeLayout = {
  nodes: LaidNode[];
  edges: LaidEdge[];
  width: number;
  height: number;
};

type Working = {
  id: string;
  text: string;
  color: string;
  depth: number;
  side: -1 | 0 | 1;
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed: boolean;
  hasChildren: boolean;
  childIds: string[];
  pos?: { x: number; y: number };
};

function sizeFor(node: MindMapNode, depth: number): { w: number; h: number } {
  const h = depth === 0 ? TREE_ROOT_H : depth === 1 ? TREE_NODE_H : TREE_LEAF_H;
  const minW = depth === 0 ? 88 : depth === 1 ? 64 : 40;
  const pad = depth === 0 ? 44 : depth === 1 ? 32 : 10;
  const char = depth === 0 ? 8.2 : depth === 1 ? 7.4 : 7.2;
  const w = Math.min(
    220,
    Math.max(minW, Math.ceil(node.text.length * char) + pad),
  );
  return { w, h };
}

function visibleChildren(node: MindMapNode): MindMapNode[] {
  if (node.collapsed) return [];
  return node.children ?? [];
}

function packSide(
  nodes: MindMapNode[],
  side: -1 | 1,
  leaf: { i: number },
  acc: Working[],
): Working[] {
  const firstLevel: Working[] = [];

  function visit(node: MindMapNode, depth: number): Working {
    const kids = visibleChildren(node);
    const size = sizeFor(node, depth);
    const packedKids = kids.map((c) => visit(c, depth + 1));
    const y =
      packedKids.length === 0
        ? leaf.i * TREE_LEAF_GAP
        : (Math.min(...packedKids.map((c) => c.y)) +
            Math.max(...packedKids.map((c) => c.y))) /
          2;
    if (packedKids.length === 0) leaf.i += 1;
    const working: Working = {
      id: node.id,
      text: node.text,
      color: node.color,
      depth,
      side,
      x: side * depth * (TREE_NODE_W + TREE_LEVEL_GAP),
      y,
      w: size.w,
      h: size.h,
      collapsed: Boolean(node.collapsed),
      hasChildren: (node.children ?? []).length > 0,
      childIds: packedKids.map((c) => c.id),
    };
    if (node.pos) working.pos = node.pos;
    acc.push(working);
    return working;
  }

  nodes.forEach((n) => firstLevel.push(visit(n, 1)));
  return firstLevel;
}

function attachByGeometry(
  parent: { x: number; y: number; w: number; h: number },
  child: { x: number; y: number; w: number; h: number },
): { x1: number; x2: number } {
  const parentMid = parent.x + parent.w / 2;
  const childMid = child.x + child.w / 2;
  if (childMid >= parentMid) {
    return { x1: parent.x + parent.w, x2: child.x };
  }
  return { x1: parent.x, x2: child.x + child.w };
}

/**
 * Árvore orgânica: raiz no centro, ramos ímpares à direita e pares à esquerda.
 * `node.pos` (arraste manual) entra depois da normalização, no espaço da tela.
 */
export function layoutMindTree(root: MindMapNode): TreeLayout {
  const children = visibleChildren(root);
  const right = children.filter((_, i) => i % 2 === 0);
  const left = children.filter((_, i) => i % 2 === 1);
  const acc: Working[] = [];
  const rightFirst = packSide(right, 1, { i: 0 }, acc);
  const leftFirst = packSide(left, -1, { i: 0 }, acc);

  const rootSize = sizeFor(root, 0);
  const firstLevel = [...rightFirst, ...leftFirst];
  const rootY =
    firstLevel.length > 0
      ? (Math.min(...firstLevel.map((n) => n.y)) +
          Math.max(...firstLevel.map((n) => n.y))) /
        2
      : 0;
  const rootW: Working = {
    id: root.id,
    text: root.text,
    color: root.color,
    depth: 0,
    side: 0,
    x: 0,
    y: rootY,
    w: rootSize.w,
    h: rootSize.h,
    collapsed: Boolean(root.collapsed),
    hasChildren: (root.children ?? []).length > 0,
    childIds: firstLevel.map((n) => n.id),
  };
  if (root.pos) rootW.pos = root.pos;
  acc.push(rootW);

  const minX = Math.min(...acc.map((n) => n.x));
  const minY = Math.min(...acc.map((n) => n.y));
  acc.forEach((n) => {
    n.x = n.x - minX + TREE_PAD;
    n.y = n.y - minY + TREE_PAD;
  });
  acc.forEach((n) => {
    if (n.pos) {
      n.x = n.pos.x;
      n.y = n.pos.y;
    }
  });

  const byId = new Map(acc.map((n) => [n.id, n]));
  const nodes: LaidNode[] = acc.map((n) => ({
    id: n.id,
    text: n.text,
    color: n.color,
    depth: n.depth,
    side: n.side,
    x: n.x,
    y: n.y,
    w: n.w,
    h: n.h,
    collapsed: n.collapsed,
    hasChildren: n.hasChildren,
  }));

  const edges: LaidEdge[] = [];
  acc.forEach((parent) => {
    if (parent.collapsed) return;
    parent.childIds.forEach((cid) => {
      const child = byId.get(cid);
      if (!child) return;
      const { x1, x2 } = attachByGeometry(parent, child);
      edges.push({
        fromId: parent.id,
        toId: child.id,
        color: child.color || parent.color,
        x1,
        y1: parent.y + TREE_NODE_HALF_H,
        x2,
        y2: child.y + TREE_NODE_HALF_H,
      });
    });
  });

  const width = Math.max(...acc.map((n) => n.x + n.w), TREE_ROOT_W) + TREE_PAD;
  const height = Math.max(...acc.map((n) => n.y + n.h), TREE_ROOT_H) + TREE_PAD;
  return { nodes, edges, width, height };
}

/** Curva cúbica tipo MindMeister: sai e chega na horizontal. */
export function mindEdgePath(edge: LaidEdge): string {
  const dx = (edge.x2 - edge.x1) * 0.55;
  return `M ${edge.x1} ${edge.y1} C ${edge.x1 + dx} ${edge.y1}, ${edge.x2 - dx} ${edge.y2}, ${edge.x2} ${edge.y2}`;
}

export function collectSubtreeIds(root: MindMapNode, id: string): string[] {
  const start = findInTree(root, id);
  if (!start) return [];
  const ids: string[] = [];
  function walk(node: MindMapNode): void {
    ids.push(node.id);
    (node.children ?? []).forEach(walk);
  }
  walk(start);
  return ids;
}

function findInTree(root: MindMapNode, id: string): MindMapNode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findInTree(child, id);
    if (found) return found;
  }
  return null;
}

/** Desloca um conjunto de nós já posicionados e redesenha as curvas. */
export function offsetLaidBranch(
  layout: TreeLayout,
  ids: ReadonlySet<string>,
  dx: number,
  dy: number,
): TreeLayout {
  const nodes = layout.nodes.map((n) =>
    ids.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n,
  );
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = layout.edges.map((edge) => {
    const from = byId.get(edge.fromId);
    const to = byId.get(edge.toId);
    if (!from || !to) return edge;
    const { x1, x2 } = attachByGeometry(from, to);
    return {
      ...edge,
      x1,
      y1: from.y + TREE_NODE_HALF_H,
      x2,
      y2: to.y + TREE_NODE_HALF_H,
    };
  });
  const width =
    Math.max(...nodes.map((n) => n.x + n.w), TREE_ROOT_W) + TREE_PAD;
  const height =
    Math.max(...nodes.map((n) => n.y + n.h), TREE_ROOT_H) + TREE_PAD;
  return { nodes, edges, width, height };
}

export function applyBranchDelta(
  root: MindMapNode,
  layout: TreeLayout,
  ids: ReadonlySet<string>,
  dx: number,
  dy: number,
): void {
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  ids.forEach((id) => {
    const node = findInTree(root, id);
    const laid = byId.get(id);
    if (!node || !laid) return;
    node.pos = { x: laid.x + dx, y: laid.y + dy };
  });
}
