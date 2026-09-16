"use client";

import { useEffect, useState } from "react";
import { CircleHelp, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "pulso-map-help";

export const MAP_COMMANDS = [
  { keys: ["Arrastar fundo"], label: "Mover o mapa" },
  { keys: ["Ctrl", "scroll"], label: "Zoom" },
  { keys: ["Alt", "arrastar"], label: "Alinhar tópico e galho" },
  { keys: ["Clique"], label: "Editar o texto" },
  { keys: ["+"], label: "Criar tópico filho" },
] as const;

export function MapCommandKbd({
  keys,
}: {
  keys: readonly string[];
}): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((key, index) => (
        <span key={key} className="inline-flex items-center gap-1">
          {index > 0 ? <span className="text-text-3">+</span> : null}
          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-surface-2 px-1.5 text-[10px] font-semibold text-text-1">
            {key}
          </kbd>
        </span>
      ))}
    </span>
  );
}

function readOpen(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) !== "0";
}

/** Cartão de atalhos no canto do mapa — aberto na primeira visita. */
export function MapHelp(): JSX.Element {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // localStorage só existe no cliente; ler no useState quebraria o SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrata preferência persistida
    setOpen(readOpen());
  }, []);

  function persist(next: boolean): void {
    setOpen(next);
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }

  return (
    <div
      data-map-help
      className="absolute top-3 left-3 z-20 max-w-[min(100%-24px,280px)]"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {open ? (
        <div className="rounded-xl border border-border bg-surface-1/95 p-3 shadow-md backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-text-1">Como usar</p>
            <button
              type="button"
              className="rounded-md p-1 text-text-2 hover:bg-surface-2 hover:text-text-1"
              onClick={() => persist(false)}
              aria-label="Fechar atalhos"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="space-y-1.5">
            {MAP_COMMANDS.map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between gap-3 text-[12px] leading-5 text-text-2"
              >
                <MapCommandKbd keys={row.keys} />
                <span className="text-right">{row.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border border-border",
            "bg-surface-1/95 text-text-2 shadow-md backdrop-blur-sm hover:text-text-1",
          )}
          onClick={() => persist(true)}
          aria-label="Ver como usar o mapa"
          title="Como usar"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
