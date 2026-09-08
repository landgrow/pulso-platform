"use client";

import {
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvidenciaTipo } from "@/lib/storage/file-validator";

export type QueuedFileStatus =
  | "pending"
  | "validating"
  | "uploading"
  | "saving"
  | "done"
  | "error"
  | "rejected";

export interface QueuedFile {
  id: string;
  file: File;
  status: QueuedFileStatus;
  error?: string;
}

const ICONS: Record<EvidenciaTipo, typeof FileText> = {
  pdf: FileText,
  excel: FileSpreadsheet,
  csv: FileSpreadsheet,
  audio: FileIcon,
  outro: FileIcon,
};

function tipoFromFilename(name: string): EvidenciaTipo {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "xlsx" || ext === "xls") return "excel";
  if (ext === "csv") return "csv";
  return "outro";
}

const STATUS_LABEL: Record<QueuedFileStatus, string> = {
  pending: "Na fila",
  validating: "Validando…",
  uploading: "Enviando…",
  saving: "Registrando…",
  done: "Enviado",
  error: "Erro",
  rejected: "Rejeitado",
};

interface UploadItemProps {
  item: QueuedFile;
  onRemove?: (id: string) => void;
}

export function UploadItem({ item, onRemove }: UploadItemProps) {
  const Icon = ICONS[tipoFromFilename(item.file.name)];
  const isBusy =
    item.status === "validating" ||
    item.status === "uploading" ||
    item.status === "saving";
  const isDone = item.status === "done";
  const isFailed = item.status === "error" || item.status === "rejected";

  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
      <Icon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.file.name}</p>
        <p className="text-xs text-muted-foreground">
          {(item.file.size / 1024).toFixed(0)}KB ·{" "}
          <span
            className={cn(
              isFailed && "text-destructive",
              isDone && "text-green-600",
            )}
          >
            {STATUS_LABEL[item.status]}
          </span>
          {isFailed && item.error ? `: ${item.error}` : null}
        </p>
      </div>
      {isBusy && (
        <Loader2
          className="size-4 shrink-0 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      )}
      {isDone && (
        <Check className="size-4 shrink-0 text-green-600" aria-hidden="true" />
      )}
      {isFailed && onRemove && (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Remover ${item.file.name} da fila`}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
