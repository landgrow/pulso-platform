"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  NotebookPen,
  Mic,
} from "lucide-react";
import type { ColecaoTipo, TimelineEntry } from "@/types/collections";
import { Badge } from "@/components/ui/badge";
import { DiffViewer } from "./diff-viewer";
import { RestoreButton } from "./restore-button";

const TIPO_ICON: Record<ColecaoTipo, typeof FileText> = {
  formulario: FileText,
  texto_livre: NotebookPen,
  transcricao_audio: Mic,
};

const TIPO_LABEL: Record<ColecaoTipo, string> = {
  formulario: "Formulário",
  texto_livre: "Texto livre",
  transcricao_audio: "Transcrição de áudio",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface RevisionItemProps {
  entry: TimelineEntry;
  previousPayload: Record<string, unknown> | undefined;
  currentUserId: string | null;
  canRestore: boolean;
}

export function RevisionItem({
  entry,
  previousPayload,
  currentUserId,
  canRestore,
}: RevisionItemProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TIPO_ICON[entry.tipo];
  const area =
    typeof entry.metadata?.area === "string"
      ? (entry.metadata.area as string)
      : null;
  const author =
    entry.createdBy === null
      ? "—"
      : entry.createdBy === currentUserId
        ? "Você"
        : "Outro usuário";

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/50"
      >
        {expanded ? (
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <Icon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="font-medium">{TIPO_LABEL[entry.tipo]}</span>
        {area && <Badge variant="outline">{area}</Badge>}
        {entry.isCurrent && <Badge variant="success">Atual</Badge>}
        {!entry.isCurrent && (
          <span className="text-xs text-muted-foreground">
            rev. {entry.revNumber}
          </span>
        )}
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {formatDate(entry.createdAt)} · {author}
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t px-4 py-3">
          <DiffViewer
            tipo={entry.tipo}
            before={previousPayload}
            after={entry.payload}
          />
          {!entry.isCurrent && canRestore && (
            <RestoreButton
              colecaoId={entry.colecaoId}
              revNumber={entry.revNumber}
            />
          )}
        </div>
      )}
    </div>
  );
}
