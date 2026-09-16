"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MapHelp } from "@/components/mindmaps/map-help";
import {
  DEFAULT_MAP_VIEW,
  MAX_MAP_SCALE,
  MIN_MAP_SCALE,
  panMapView,
  zoomMapView,
  type MapView,
} from "@/lib/mindmaps/viewport";

const PAN_THRESHOLD_PX = 6;

function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("input, textarea, [contenteditable='true']"));
}

type DragState = {
  pointerId: number;
  lastX: number;
  lastY: number;
  startX: number;
  startY: number;
  moved: boolean;
};

/** Viewport de mapa: clique e arraste para mover, Ctrl/Cmd + scroll para zoom. */
export function MapViewport({
  children,
  fill = false,
  toolbarLeft,
}: {
  children: ReactNode;
  fill?: boolean;
  toolbarLeft?: ReactNode;
}): JSX.Element {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView>(DEFAULT_MAP_VIEW);
  const [view, setView] = useState<MapView>(DEFAULT_MAP_VIEW);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const [panning, setPanning] = useState(false);

  const commit = useCallback((next: MapView) => {
    viewRef.current = next;
    setView(next);
  }, []);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const pointer = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
      commit(
        zoomMapView(viewRef.current, pointer, viewRef.current.scale * factor),
      );
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [commit]);

  useEffect(() => {
    function onMove(event: PointerEvent): void {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved) {
        if (Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return;
        drag.moved = true;
        suppressClickRef.current = true;
        setPanning(true);
      }
      commit(
        panMapView(viewRef.current, {
          x: event.clientX - drag.lastX,
          y: event.clientY - drag.lastY,
        }),
      );
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    }

    function onUp(event: PointerEvent): void {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setPanning(false);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [commit]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.button !== 0 && event.button !== 1) return;
    if (event.button === 0 && isEditingTarget(event.target)) return;
    if (
      event.button === 0 &&
      event.target instanceof Element &&
      event.target.closest("[data-map-node], [data-map-help]")
    ) {
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  }

  function handleClickCapture(event: {
    preventDefault: () => void;
    stopPropagation: () => void;
  }): void {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }

  function zoomFromCenter(direction: 1 | -1): void {
    const el = surfaceRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pointer = { x: rect.width / 2, y: rect.height / 2 };
    const factor = direction > 0 ? 1.15 : 1 / 1.15;
    commit(
      zoomMapView(viewRef.current, pointer, viewRef.current.scale * factor),
    );
  }

  const percent = Math.round(view.scale * 100);

  return (
    <div className={cn("flex min-h-0 flex-col", fill && "flex-1")}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface-1 px-3.5 py-2">
        {toolbarLeft}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="rounded-md p-1.5 text-text-2 hover:bg-surface-2 hover:text-text-1"
            onClick={() => zoomFromCenter(-1)}
            disabled={view.scale <= MIN_MAP_SCALE}
            aria-label="Diminuir zoom"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center text-xs tabular-nums text-text-2">
            {percent}%
          </span>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-2 hover:bg-surface-2 hover:text-text-1"
            onClick={() => zoomFromCenter(1)}
            disabled={view.scale >= MAX_MAP_SCALE}
            aria-label="Aumentar zoom"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-2 hover:bg-surface-2 hover:text-text-1"
            onClick={() => commit(DEFAULT_MAP_VIEW)}
            aria-label="Ajustar à tela"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div
        ref={surfaceRef}
        className={cn(
          "relative overflow-hidden select-none touch-none",
          "bg-[length:24px_24px] bg-[var(--bg)]",
          fill ? "min-h-[min(60vh,520px)] flex-1" : "h-[min(70vh,720px)]",
          panning ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--border) 65%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) 65%, transparent) 1px, transparent 1px)",
        }}
        onPointerDown={handlePointerDown}
        onClickCapture={handleClickCapture}
      >
        <div
          className="origin-top-left w-max min-w-full p-2"
          data-map-viewport
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            ["--map-scale" as string]: String(view.scale),
          }}
        >
          {children}
        </div>
        <MapHelp />
      </div>
    </div>
  );
}
