"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/** Texto clicável que vira input ao editar — título de mapa/coluna/item, nome de propriedade/coluna do kanban etc. */
export function InlineText({
  value,
  onCommit,
  className,
  inputClassName,
  wrap = false,
}: {
  value: string;
  onCommit: (text: string) => void;
  className?: string;
  inputClassName?: string;
  wrap?: boolean;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <Input
        autoFocus
        className={inputClassName}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const text = draft.trim();
          if (text && text !== value) onCommit(text);
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={cn(
        "text-left",
        wrap ? "whitespace-normal" : "truncate",
        className,
      )}
      title="Clique para editar"
    >
      {value}
    </button>
  );
}
