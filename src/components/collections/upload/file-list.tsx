"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Eye,
  Download,
  Trash2,
} from "lucide-react";
import type { Evidencia } from "@/types/collections";
import { deleteEvidencia } from "@/app/actions/evidencias";
import { deleteFromStorage, getSignedDownloadUrl } from "@/lib/storage/upload";
import { PdfPreview } from "./pdf-preview";
import { ExcelPreview } from "./excel-preview";

const ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  excel: FileSpreadsheet,
  csv: FileSpreadsheet,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface FileListProps {
  evidencias: Evidencia[];
  currentUserId: string | null;
  canDeleteAny: boolean;
  readOnly?: boolean;
  onDeleted: (evidenciaId: string) => void;
}

export function FileList({
  evidencias,
  currentUserId,
  canDeleteAny,
  readOnly = false,
  onDeleted,
}: FileListProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (evidencias.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhum arquivo enviado neste período ainda.
      </p>
    );
  }

  async function handlePreview(evidencia: Evidencia) {
    if (previewId === evidencia.id) {
      setPreviewId(null);
      setPreviewUrl(null);
      return;
    }
    try {
      const url = await getSignedDownloadUrl(evidencia.storage_path);
      setPreviewId(evidencia.id);
      setPreviewUrl(url);
    } catch (err) {
      toast.error("Erro ao carregar pré-visualização", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDownload(evidencia: Evidencia) {
    try {
      const url = await getSignedDownloadUrl(evidencia.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error("Erro ao gerar link de download", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDelete(evidencia: Evidencia) {
    if (
      !window.confirm(
        `Excluir "${evidencia.nome_original}"? Essa ação não pode ser desfeita.`,
      )
    ) {
      return;
    }
    setDeletingId(evidencia.id);
    const result = await deleteEvidencia({ evidenciaId: evidencia.id });
    if (!result.success) {
      toast.error("Erro ao excluir", { description: result.error });
      setDeletingId(null);
      return;
    }
    try {
      await deleteFromStorage(result.data.storagePath);
    } catch (err) {
      // Linha do banco já foi removida — o objeto órfão no Storage não bloqueia o usuário,
      // mas registramos pra não passar batido.
      console.error(
        "[file-list] Falha ao remover objeto órfão do Storage:",
        err,
      );
    }
    setDeletingId(null);
    if (previewId === evidencia.id) {
      setPreviewId(null);
      setPreviewUrl(null);
    }
    onDeleted(evidencia.id);
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Nome</th>
              <th className="px-3 py-2 text-left font-medium">Tamanho</th>
              <th className="px-3 py-2 text-left font-medium">Enviado em</th>
              <th className="px-3 py-2 text-left font-medium">Por</th>
              <th className="px-3 py-2 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {evidencias.map((ev) => {
              const Icon = ICONS[ev.tipo] ?? FileIcon;
              const canDelete =
                !readOnly && (canDeleteAny || ev.uploaded_by === currentUserId);
              const canPreview =
                ev.tipo === "pdf" || ev.tipo === "excel" || ev.tipo === "csv";
              return (
                <tr key={ev.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Icon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="truncate">{ev.nome_original}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatSize(ev.tamanho_bytes)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDate(ev.created_at)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {ev.uploaded_by === currentUserId ? "Você" : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {canPreview && (
                        <button
                          type="button"
                          onClick={() => handlePreview(ev)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`Pré-visualizar ${ev.nome_original}`}
                          title="Pré-visualizar"
                        >
                          <Eye className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownload(ev)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={`Baixar ${ev.nome_original}`}
                        title="Baixar"
                      >
                        <Download className="size-4" />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(ev)}
                          disabled={deletingId === ev.id}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                          aria-label={`Excluir ${ev.nome_original}`}
                          title="Excluir"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {previewId && previewUrl && (
        <div>
          {(() => {
            const ev = evidencias.find((e) => e.id === previewId);
            if (!ev) return null;
            if (ev.tipo === "pdf")
              return (
                <PdfPreview
                  signedUrl={previewUrl}
                  filename={ev.nome_original}
                />
              );
            return (
              <ExcelPreview
                signedUrl={previewUrl}
                filename={ev.nome_original}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}
