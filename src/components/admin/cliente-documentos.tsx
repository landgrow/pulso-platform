"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import {
  getEvidenciaDownloadUrl,
  listClienteDocumentos,
  type DocumentoArquivo,
  type DocumentoTexto,
} from "@/app/actions/documentos";
import { EmptyState } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Aba do admin: textos livres e arquivos que o cliente enviou na coleta. */
export function ClienteDocumentos({ orgId }: { orgId: string }): JSX.Element {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; textos: DocumentoTexto[]; arquivos: DocumentoArquivo[] }
  >({ kind: "loading" });
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listClienteDocumentos(orgId).then((r) => {
      if (cancelled) return;
      setState(
        r.success
          ? { kind: "ready", ...r.data }
          : { kind: "error", message: r.error },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  async function download(id: string): Promise<void> {
    setDownloading(id);
    const r = await getEvidenciaDownloadUrl(id);
    setDownloading(null);
    if (!r.success) {
      toast.error("Não consegui baixar", { description: r.error });
      return;
    }
    window.open(r.data.url, "_blank", "noopener,noreferrer");
  }

  if (state.kind === "loading") {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-text-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando documentos…
      </div>
    );
  }
  if (state.kind === "error") {
    return <p className="text-sm text-error">{state.message}</p>;
  }
  if (state.textos.length === 0 && state.arquivos.length === 0) {
    return (
      <EmptyState
        title="O cliente ainda não enviou documentos"
        description="Arquivos e textos livres enviados em Documentos (portal do cliente) aparecem aqui."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-1">
          <FileText className="h-4 w-4 text-text-2" /> Arquivos (
          {state.arquivos.length})
        </h3>
        {state.arquivos.length === 0 ? (
          <p className="text-sm text-text-2">Nenhum arquivo.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-1">
            {state.arquivos.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-text-1">
                  {a.nome}
                </span>
                <span className="text-xs uppercase text-text-3">{a.tipo}</span>
                <span className="text-xs tabular-nums text-text-2">
                  {formatBytes(a.tamanhoBytes)}
                </span>
                <span className="text-xs text-text-2">Período {a.periodo}</span>
                <span className="text-xs text-text-3">
                  {formatDate(a.createdAt)}
                </span>
                <button
                  type="button"
                  onClick={() => void download(a.id)}
                  disabled={downloading === a.id}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {downloading === a.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Baixar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-1">
          <NotebookPen className="h-4 w-4 text-text-2" /> Textos livres (
          {state.textos.length})
        </h3>
        {state.textos.length === 0 ? (
          <p className="text-sm text-text-2">Nenhum texto.</p>
        ) : (
          <ul className="space-y-3">
            {state.textos.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-border bg-surface-1 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-text-2">
                  {t.area ? (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 font-medium text-text-1">
                      {t.area}
                    </span>
                  ) : null}
                  <span>Período {t.periodo}</span>
                  <span className="text-text-3">
                    · {formatDate(t.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-text-1">
                  {t.conteudo}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
