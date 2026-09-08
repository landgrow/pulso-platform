"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import type { FormularioBloco } from "@/lib/formulario-questions";
import { FormField } from "./form-field";

interface FormBlocoAreaProps {
  bloco: FormularioBloco;
  values: Record<string, unknown>;
  errors: Record<string, string | undefined>;
  onChange: (id: string, value: unknown) => void;
  readOnly?: boolean;
}

export function FormBlocoArea({
  bloco,
  values,
  errors,
  onChange,
  readOnly = false,
}: FormBlocoAreaProps) {
  const [open, setOpen] = useState(true);
  const filled = bloco.perguntas.filter((p) => {
    const v = values[p.id];
    return v !== undefined && v !== null && v !== "";
  }).length;
  const total = bloco.perguntas.length;
  const isComplete = filled === total;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border"
    >
      {/* Header do bloco — sempre visível */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-l-4 cursor-pointer select-none",
          bloco.cor,
          open ? "border-b" : "",
        )}
        onClick={() => !readOnly && setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm">{bloco.area}</span>
          <span className="text-xs text-muted-foreground">
            {filled}/{total} campos
          </span>
          {isComplete && (
            <span className="text-xs text-green-600 font-medium">
              ✓ Completo
            </span>
          )}
        </div>
        {!readOnly && (
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </div>

      {/* Conteúdo do bloco */}
      <CollapsibleContent>
        <div className="p-4 space-y-4">
          {bloco.perguntas.map((campo) => (
            <FormField
              key={campo.id}
              campo={campo}
              value={values[campo.id]}
              error={errors[campo.id] ?? undefined}
              onChange={(val) => onChange(campo.id, val)}
              readOnly={readOnly}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
