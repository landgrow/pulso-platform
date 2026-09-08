"use client";

import { useState } from "react";
import type { Colecao } from "@/types/collections";
import { TextoForm } from "./texto-form";
import { TextoList } from "./texto-list";

interface TextoPageClientProps {
  periodoId: string;
  initialTextos: Colecao[];
  currentUserId: string | null;
  canDeleteAny: boolean;
  readOnly?: boolean;
}

export function TextoPageClient({
  periodoId,
  initialTextos,
  currentUserId,
  canDeleteAny,
  readOnly = false,
}: TextoPageClientProps) {
  const [textos, setTextos] = useState<Colecao[]>(initialTextos);

  function handleCreated(colecao: Colecao) {
    setTextos((prev) => [colecao, ...prev]);
  }

  function handleUpdated(colecao: Colecao) {
    setTextos((prev) => prev.map((t) => (t.id === colecao.id ? colecao : t)));
  }

  function handleDeleted(colecaoId: string) {
    setTextos((prev) => prev.filter((t) => t.id !== colecaoId));
  }

  return (
    <div className="space-y-6">
      {!readOnly && (
        <TextoForm periodoId={periodoId} onCreated={handleCreated} />
      )}

      {readOnly && (
        <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Este período está congelado porque foi fechado ou analisado — novos
          textos não podem ser adicionados.
        </div>
      )}

      <TextoList
        textos={textos}
        currentUserId={currentUserId}
        canDeleteAny={canDeleteAny}
        readOnly={readOnly}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
