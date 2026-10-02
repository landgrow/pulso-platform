"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { specifyKey } from "@/lib/bin-v2/answers";
import type { FormularioBloco } from "@/lib/formulario-questions";
import { FormField } from "./form-field";

interface FormBlocoAreaProps {
  bloco: FormularioBloco;
  values: Record<string, unknown>;
  errors: Record<string, string | undefined>;
  onChange: (id: string, value: unknown) => void;
  readOnly?: boolean;
  defaultOpen?: boolean;
  isVisible?: (id: string) => boolean;
  numbered?: boolean;
}

export function FormBlocoArea({
  bloco,
  values,
  errors,
  onChange,
  readOnly = false,
  defaultOpen = true,
  isVisible,
  numbered = false,
}: FormBlocoAreaProps) {
  const [open, setOpen] = useState(defaultOpen);
  const perguntas = bloco.perguntas.filter((p) =>
    isVisible ? isVisible(p.id) : true,
  );
  const filled = perguntas.filter((p) => {
    const v = values[p.id];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && v !== "";
  }).length;
  const total = perguntas.length;
  const isComplete = total > 0 && filled === total;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border"
    >
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-l-4 cursor-pointer select-none",
          bloco.cor,
          open ? "border-b" : "",
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm">{bloco.area}</span>
          <span className="text-xs text-muted-foreground">
            {filled}/{total} campos
          </span>
          {isComplete && (
            <span className="text-xs text-success font-medium">Completo</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </div>

      <CollapsibleContent>
        <div className="p-4 space-y-6">
          {perguntas.map((campo, index) => (
            <FormField
              key={campo.id}
              campo={campo}
              {...(numbered ? { number: index + 1 } : {})}
              value={values[campo.id]}
              error={errors[campo.id] ?? undefined}
              specifyValue={values[specifyKey(campo.id)]}
              specifyError={errors[specifyKey(campo.id)] ?? undefined}
              onChange={(val) => onChange(campo.id, val)}
              onSpecifyChange={(val) => onChange(specifyKey(campo.id), val)}
              readOnly={readOnly}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
