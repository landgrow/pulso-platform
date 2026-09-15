"use client";

import { useTheme } from "@/components/layout/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "light" as const, label: "Claro", hint: "Fundo claro o tempo todo." },
  { id: "dark" as const, label: "Escuro", hint: "Fundo escuro o tempo todo." },
  {
    id: "system" as const,
    label: "Sistema",
    hint: "Segue o claro/escuro do computador.",
  },
];

export default function AparenciaPage(): JSX.Element {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Aparência</h1>
        <p className="text-text-2">
          Vale neste navegador. O mesmo controle do ícone no topo.
        </p>
      </div>
      <div className="grid gap-3">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            className={cn(
              "text-left rounded-lg border p-4 transition-colors",
              theme === option.id
                ? "border-primary bg-primary/10"
                : "border-border bg-surface-1 hover:border-primary/40",
            )}
          >
            <p className="text-sm font-medium text-text-1">{option.label}</p>
            <p className="text-sm text-text-2">{option.hint}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
