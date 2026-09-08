"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_FILE_SIZE } from "@/lib/storage/file-validator";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  onRejected?: (rejections: FileRejection[]) => void;
  disabled?: boolean;
}

// Única fonte de verdade do mapa MIME -> extensão aceita pelo dropzone.
// Precisa bater com ACCEPTED_MIMES em file-validator.ts e com o bucket
// `evidencias` (db/migrations/0006_storage_evidencias.sql) — os três lugares
// descrevem a mesma lista de formatos aceitos.
const ACCEPT: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "text/csv": [".csv"],
};

export function DropZone({
  onFiles,
  onRejected,
  disabled = false,
}: DropZoneProps) {
  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (accepted.length > 0) onFiles(accepted);
      if (rejections.length > 0) onRejected?.(rejections);
    },
    [onFiles, onRejected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_FILE_SIZE,
    disabled,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input
        {...getInputProps()}
        aria-label="Selecionar arquivos para upload"
      />
      <UploadCloud
        className="size-8 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="text-sm font-medium">
        {isDragActive
          ? "Solte os arquivos aqui"
          : "Arraste arquivos ou clique para selecionar"}
      </p>
      <p className="text-xs text-muted-foreground">
        PDF, Excel (.xlsx/.xls) ou CSV · até{" "}
        {Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB por arquivo
      </p>
    </div>
  );
}
