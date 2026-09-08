"use client";

import { useState } from "react";
import type { Evidencia } from "@/types/collections";
import { FileList } from "@/components/collections/upload/file-list";

interface ListaEvidenciasPeriodoProps {
  initialEvidencias: Evidencia[];
  currentUserId: string | null;
  canDeleteAny: boolean;
  readOnly?: boolean;
}

/**
 * Wrapper fino em volta de `FileList` (já construído na Story 1.4) só pra
 * dar a ela estado local de lista nesta página — a própria FileList já cobre
 * preview/download/exclusão da AC-4 desta story.
 */
export function ListaEvidenciasPeriodo({
  initialEvidencias,
  currentUserId,
  canDeleteAny,
  readOnly = false,
}: ListaEvidenciasPeriodoProps) {
  const [evidencias, setEvidencias] = useState(initialEvidencias);

  return (
    <FileList
      evidencias={evidencias}
      currentUserId={currentUserId}
      canDeleteAny={canDeleteAny}
      readOnly={readOnly}
      onDeleted={(id) =>
        setEvidencias((prev) => prev.filter((e) => e.id !== id))
      }
    />
  );
}
