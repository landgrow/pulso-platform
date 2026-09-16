"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Minus, Plus, X } from "lucide-react";
import { InlineText } from "@/components/layout/inline-text";
import { cn } from "@/lib/utils";
import {
  layoutMindTree,
  mindEdgePath,
  collectSubtreeIds,
  offsetLaidBranch,
  applyBranchDelta,
  TREE_NODE_HALF_H,
  type LaidNode,
} from "@/lib/mindmaps/tree-layout";
import type { MindMapNode } from "@/types/mindmaps";

const PALETTE = [
  "#3b82f6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
];

function findNode(root: MindMapNode, id: string): MindMapNode | null {
  if (root.id === id) return root;
  for (const c of root.children) {
    const found = findNode(c, id);
    if (found) return found;
  }
  return null;
}

function cloneTree(root: MindMapNode): MindMapNode {
  return JSON.parse(JSON.stringify(root)) as MindMapNode;
}

export function RadialTree({
  tree,
  onChange,
}: {
  tree: MindMapNode;
  onChange: (next: MindMapNode) => void;
}): JSX.Element {
  const layout = useMemo(() => layoutMindTree(tree), [tree]);
  const rootLaid = layout.nodes.find((n) => n.depth === 0);
  const [selectedId, setSelectedId] = useState<string | null>(tree.id);
  const [altHeld, setAltHeld] = useState(false);
  const [nudge, setNudge] = useState<{
    ids: Set<string>;
    dx: number;
    dy: number;
  } | null>(null);
  const dragRef = useRef<{
    id: string;
    ids: Set<string>;
    startX: number;
    startY: number;
    pointerId: number;
  } | null>(null);

  const display = nudge
    ? offsetLaidBranch(layout, nudge.ids, nudge.dx, nudge.dy)
    : layout;

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Alt") setAltHeld(event.type === "keydown");
    }
    function onBlur(): void {
      setAltHeld(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  function commit(mutator: (root: MindMapNode) => void): void {
    const next = cloneTree(tree);
    mutator(next);
    onChange(next);
  }

  function handleAdd(parentId: string): void {
    commit((root) => {
      const parent = findNode(root, parentId);
      if (!parent) return;
      parent.collapsed = false;
      const color =
        parent.id === root.id
          ? (PALETTE[parent.children.length % PALETTE.length] ?? "#3B82F6")
          : parent.color;
      parent.children.push({
        id: crypto.randomUUID(),
        text: "Novo tópico",
        color,
        children: [],
      });
    });
  }

  function handleDelete(id: string): void {
    if (id === tree.id) return;
    commit((root) => {
      function strip(node: MindMapNode): void {
        node.children = node.children.filter((c) => c.id !== id);
        node.children.forEach(strip);
      }
      strip(root);
    });
  }

  function handleRename(id: string, text: string): void {
    commit((root) => {
      const node = findNode(root, id);
      if (node) node.text = text;
    });
  }

  function handleToggle(id: string): void {
    commit((root) => {
      const node = findNode(root, id);
      if (node) node.collapsed = !node.collapsed;
    });
  }

  function worldDelta(
    event: ReactPointerEvent<HTMLDivElement>,
    startX: number,
    startY: number,
  ): { dx: number; dy: number } {
    const host = event.currentTarget.closest("[data-map-viewport]");
    const raw =
      host instanceof HTMLElement
        ? host.style.getPropertyValue("--map-scale")
        : "";
    const scale = Number.parseFloat(raw) || 1;
    return {
      dx: (event.clientX - startX) / scale,
      dy: (event.clientY - startY) / scale,
    };
  }

  function isNodeControl(target: EventTarget | null): boolean {
    return Boolean(
      target instanceof Element && target.closest("[data-mm-control]"),
    );
  }

  function onNodePointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    node: LaidNode,
  ): void {
    if (event.button !== 0) return;
    if (isNodeControl(event.target)) return;
    setSelectedId(node.id);
    if (!event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: node.id,
      ids: new Set(collectSubtreeIds(tree, node.id)),
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
    };
  }

  function onNodeClickCapture(event: ReactMouseEvent<HTMLDivElement>): void {
    if (!event.altKey && !nudge) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onNodePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const { dx, dy } = worldDelta(event, drag.startX, drag.startY);
    if (Math.hypot(dx, dy) < 4) return;
    setNudge({ ids: drag.ids, dx, dy });
  }

  function onNodePointerUp(event: ReactPointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const { dx, dy } = worldDelta(event, drag.startX, drag.startY);
    setNudge(null);
    if (Math.hypot(dx, dy) < 4) return;
    commit((root) => {
      applyBranchDelta(root, layout, drag.ids, dx, dy);
    });
  }

  return (
    <div
      className={cn("relative", altHeld && "cursor-grab")}
      style={{ width: display.width, height: display.height, minHeight: 320 }}
    >
      <svg
        className="absolute inset-0 overflow-visible pointer-events-none"
        width={display.width}
        height={display.height}
        aria-hidden
      >
        {display.edges.map((edge) => (
          <path
            key={`${edge.fromId}-${edge.toId}`}
            d={mindEdgePath(edge)}
            fill="none"
            stroke={edge.color}
            strokeWidth={2.25}
            strokeLinecap="round"
            opacity={0.7}
          />
        ))}
        {display.nodes
          .filter((n) => n.hasChildren && !n.collapsed)
          .flatMap((n) => {
            const outgoing = display.edges.filter((e) => e.fromId === n.id);
            const dots: { cx: number; key: string }[] = [];
            if (outgoing.some((e) => e.x2 >= e.x1)) {
              dots.push({ cx: n.x + n.w, key: `jr-${n.id}` });
            }
            if (outgoing.some((e) => e.x2 < e.x1)) {
              dots.push({ cx: n.x, key: `jl-${n.id}` });
            }
            return dots.map((d) => (
              <circle
                key={d.key}
                cx={d.cx}
                cy={n.y + TREE_NODE_HALF_H}
                r={4}
                fill="var(--surface-1, #fff)"
                stroke={n.color || "#27272a"}
                strokeWidth={2}
              />
            ));
          })}
      </svg>

      {display.nodes.map((n) => {
        const selected = selectedId === n.id;
        const leaf = n.depth >= 2;
        const fill = n.color || "#27272a";
        return (
          <div
            key={n.id}
            data-map-node
            data-depth={n.depth}
            data-side={n.side}
            className={cn(
              "group/node absolute flex max-w-[220px] items-center gap-1",
              altHeld && "cursor-grab",
              nudge?.ids.has(n.id) && "cursor-grabbing",
            )}
            style={{
              left: n.x,
              top: n.y,
              transform: "translate(-2px, -19px)",
              zIndex: n.depth === 0 ? 2 : 1,
              ["--node-color" as string]: fill,
            }}
            onPointerDownCapture={(e) => onNodePointerDown(e, n)}
            onPointerMove={onNodePointerMove}
            onPointerUp={onNodePointerUp}
            onPointerCancel={onNodePointerUp}
            onClickCapture={onNodeClickCapture}
          >
            <div
              className={cn(
                "relative min-w-10 font-semibold leading-[1.3] outline-none transition-[box-shadow] duration-100",
                n.depth === 0 &&
                  "rounded-xl px-[18px] py-2.5 text-[14px] text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]",
                n.depth === 1 &&
                  "rounded-[9px] px-3.5 py-2 text-[12.5px] text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]",
                leaf && "rounded-md px-0.5 py-1 text-[13px] hover:bg-surface-2",
                selected &&
                  !leaf &&
                  "shadow-[0_0_0_3px_var(--surface-1),0_0_0_5px_var(--node-color)]",
                selected && leaf && "bg-surface-2",
              )}
              style={
                leaf ? { color: fill } : { background: fill, color: "#fff" }
              }
            >
              <InlineText
                wrap
                value={n.text}
                onCommit={(text) => handleRename(n.id, text)}
                className={cn(
                  "block max-w-full text-left font-semibold leading-[1.3]",
                  n.depth === 0 && "text-[14px] text-white",
                  n.depth === 1 && "text-[12.5px] text-white",
                  leaf && "text-[13px]",
                )}
                inputClassName={cn(
                  "h-7 w-full min-w-[7rem] text-sm font-semibold",
                  !leaf && "border-white/20 bg-white/15 text-white",
                )}
              />
              {n.hasChildren && (
                <button
                  type="button"
                  data-mm-control
                  className="absolute top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[var(--bg)] text-[9px] font-bold text-white"
                  style={{
                    background: fill,
                    [n.side < 0 ? "left" : "right"]: -8,
                  }}
                  onClick={() => handleToggle(n.id)}
                  aria-label={n.collapsed ? "Expandir" : "Recolher"}
                >
                  {n.collapsed ? (
                    <Plus className="h-2.5 w-2.5" />
                  ) : (
                    <Minus className="h-2.5 w-2.5" />
                  )}
                </button>
              )}
            </div>
            <div
              className={cn(
                "flex flex-col gap-0.5 opacity-0 transition-opacity duration-100",
                "group-hover/node:opacity-100 group-focus-within/node:opacity-100",
                selected && "opacity-100",
              )}
            >
              <button
                type="button"
                data-mm-control
                className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-surface-1 text-xs text-text-2 shadow-sm hover:bg-surface-2 hover:text-text-1"
                onClick={() => handleAdd(n.id)}
                aria-label="Adicionar tópico"
              >
                <Plus className="h-3 w-3" />
              </button>
              {n.depth > 0 && (
                <button
                  type="button"
                  data-mm-control
                  className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-surface-1 text-text-2 shadow-sm hover:bg-surface-2 hover:text-error"
                  onClick={() => handleDelete(n.id)}
                  aria-label="Excluir"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {display.nodes.length === 1 && rootLaid && (
        <p
          className="absolute max-w-[240px] rounded-md border border-dashed border-border bg-surface-1 px-3 py-2 text-[12px] leading-5 text-text-2"
          style={{ left: rootLaid.x + rootLaid.w + 16, top: rootLaid.y }}
        >
          Clique no + para ramificar.
        </p>
      )}
    </div>
  );
}
