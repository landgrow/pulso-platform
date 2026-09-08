import { FileText } from "lucide-react";
import { diffFields, diffText } from "@/lib/diff";
import type { ColecaoTipo } from "@/types/collections";

interface DiffViewerProps {
  tipo: ColecaoTipo;
  before: Record<string, unknown> | undefined;
  after: Record<string, unknown>;
}

function formatValue(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export function DiffViewer({ tipo, before, after }: DiffViewerProps) {
  if (!before) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="size-3.5 shrink-0" aria-hidden="true" />
        Primeira versão registrada — sem versão anterior para comparar.
      </p>
    );
  }

  if (tipo === "texto_livre" || tipo === "transcricao_audio") {
    const key = tipo === "texto_livre" ? "conteudo" : "transcricao";
    const beforeText =
      typeof before[key] === "string" ? (before[key] as string) : "";
    const afterText =
      typeof after[key] === "string" ? (after[key] as string) : "";
    const parts = diffText(beforeText, afterText);

    if (parts.length === 1 && !parts[0]?.added && !parts[0]?.removed) {
      return (
        <p className="text-xs text-muted-foreground">
          Conteúdo do texto não mudou (só metadados, ex: área).
        </p>
      );
    }

    return (
      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed whitespace-pre-wrap">
        {parts.map((part, i) => (
          <span
            key={i}
            className={
              part.added
                ? "block bg-success/15 text-success"
                : part.removed
                  ? "block bg-destructive/15 text-destructive line-through"
                  : "block text-muted-foreground"
            }
          >
            {part.value}
          </span>
        ))}
      </pre>
    );
  }

  const fields = diffFields(before, after);
  if (fields.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhum campo mudou (só metadados).
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead className="bg-muted">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium">Campo</th>
            <th className="px-2 py-1.5 text-left font-medium">Antes</th>
            <th className="px-2 py-1.5 text-left font-medium">Depois</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.key} className="border-t">
              <td className="px-2 py-1.5 font-mono">{f.key}</td>
              <td className="px-2 py-1.5 text-destructive">
                {f.status === "added" ? "—" : formatValue(f.before)}
              </td>
              <td className="px-2 py-1.5 text-success">
                {f.status === "removed" ? "—" : formatValue(f.after)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
