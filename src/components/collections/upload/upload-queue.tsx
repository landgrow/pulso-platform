"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { FileRejection } from "react-dropzone";
import type { Evidencia } from "@/types/collections";
import {
  validateFile,
  validateFileList,
  checkMagicNumber,
  sha256,
  tipoFromMime,
  formatValidationError,
} from "@/lib/storage/file-validator";
import {
  buildStoragePath,
  uploadToStorageWithRetry,
  deleteFromStorage,
} from "@/lib/storage/upload";
import { uploadEvidencia } from "@/app/actions/evidencias";
import { DropZone } from "./drop-zone";
import { UploadItem, type QueuedFile } from "./upload-item";
import { FileList } from "./file-list";

interface UploadQueueProps {
  periodoId: string;
  orgId: string;
  initialEvidencias: Evidencia[];
  currentUserId: string | null;
  canDeleteAny: boolean;
  readOnly?: boolean;
}

export function UploadQueue({
  periodoId,
  orgId,
  initialEvidencias,
  currentUserId,
  canDeleteAny,
  readOnly = false,
}: UploadQueueProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [evidencias, setEvidencias] = useState<Evidencia[]>(initialEvidencias);

  function updateItem(id: string, patch: Partial<QueuedFile>) {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function removeItem(id: string) {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }

  async function processFile(item: QueuedFile) {
    updateItem(item.id, { status: "validating" });

    const syncError = validateFile(item.file);
    if (syncError) {
      updateItem(item.id, {
        status: "rejected",
        error: formatValidationError(syncError),
      });
      return;
    }

    const magicOk = await checkMagicNumber(item.file);
    if (!magicOk) {
      updateItem(item.id, {
        status: "rejected",
        error: formatValidationError({ code: "BAD_MAGIC" }),
      });
      return;
    }

    const hash = await sha256(item.file);
    const evidenciaId = crypto.randomUUID();
    const storagePath = buildStoragePath(
      orgId,
      periodoId,
      evidenciaId,
      item.file.name,
    );

    updateItem(item.id, { status: "uploading" });
    try {
      await uploadToStorageWithRetry(storagePath, item.file);
    } catch (err) {
      updateItem(item.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Falha no envio",
      });
      return;
    }

    updateItem(item.id, { status: "saving" });
    const result = await uploadEvidencia({
      id: evidenciaId,
      periodoId,
      storagePath,
      tipo: tipoFromMime(item.file.type),
      nomeOriginal: item.file.name,
      mimeType: item.file.type,
      tamanhoBytes: item.file.size,
      hash,
    });

    if (!result.success) {
      // Registro falhou (ex.: duplicata, período fechado) — não deixa o arquivo
      // órfão no Storage.
      try {
        await deleteFromStorage(storagePath);
      } catch (cleanupErr) {
        console.error(
          "[upload-queue] Falha ao limpar objeto órfão:",
          cleanupErr,
        );
      }
      updateItem(item.id, { status: "error", error: result.error });
      return;
    }

    updateItem(item.id, { status: "done" });
    setEvidencias((prev) => [result.data.evidencia, ...prev]);
    toast.success(`"${item.file.name}" enviado com sucesso`);
    setTimeout(() => removeItem(item.id), 2000);
  }

  function handleFiles(files: File[]) {
    const listError = validateFileList([...queue.map((q) => q.file), ...files]);
    if (listError) {
      toast.error(formatValidationError(listError));
      return;
    }

    const newItems: QueuedFile[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "pending",
    }));
    setQueue((prev) => [...prev, ...newItems]);
    newItems.forEach((item) => void processFile(item));
  }

  function handleRejected(rejections: FileRejection[]) {
    for (const rejection of rejections) {
      toast.error(`"${rejection.file.name}" rejeitado`, {
        description: rejection.errors.map((e) => e.message).join("; "),
      });
    }
  }

  function handleDeleted(evidenciaId: string) {
    setEvidencias((prev) => prev.filter((e) => e.id !== evidenciaId));
  }

  return (
    <div className="space-y-6">
      {!readOnly && (
        <>
          <DropZone
            onFiles={handleFiles}
            onRejected={handleRejected}
            disabled={readOnly}
          />
          {queue.length > 0 && (
            <div className="space-y-2">
              {queue.map((item) => (
                <UploadItem key={item.id} item={item} onRemove={removeItem} />
              ))}
            </div>
          )}
        </>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Arquivos enviados ({evidencias.length})
        </h2>
        <FileList
          evidencias={evidencias}
          currentUserId={currentUserId}
          canDeleteAny={canDeleteAny}
          readOnly={readOnly}
          onDeleted={handleDeleted}
        />
      </div>
    </div>
  );
}
