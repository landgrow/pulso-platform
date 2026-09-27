"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ENTER_MS = 180;
const EXIT_MS = 140;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Modal central estilo ClickUp — não usa Sheet (aba lateral). */
export function TaskModal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}): JSX.Element | null {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- drives the mount-then-animate-in sequence on open
      setMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setShown(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const timeout = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, onClose]);

  if (!mounted) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8">
      <button
        type="button"
        aria-label="Fechar"
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity",
          shown ? "opacity-100" : "opacity-0",
        )}
        style={{
          transitionDuration: `${shown ? ENTER_MS : EXIT_MS}ms`,
          transitionTimingFunction: EASE,
        }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 flex h-[min(90vh,880px)] w-full max-w-[1180px] overflow-hidden rounded-xl border border-border bg-background shadow-2xl",
          shown
            ? "opacity-100 translate-y-0 blur-0"
            : "opacity-0 translate-y-2 blur-[4px]",
        )}
        style={{
          transitionProperty: "opacity, transform, filter",
          transitionDuration: `${shown ? ENTER_MS : EXIT_MS}ms`,
          transitionTimingFunction: EASE,
        }}
      >
        {children}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 rounded-md p-1.5 text-text-2 hover:bg-surface-2 hover:text-text-1"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
