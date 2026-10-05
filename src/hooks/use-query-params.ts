"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { applyQueryPatch, type QueryPatch } from "@/lib/url-state";

/**
 * Estado de navegação dentro da página (lista aberta, aba, pasta) guardado na
 * URL em vez de no useState. Assim o "Voltar" do navegador devolve exatamente
 * a tela de onde a pessoa saiu — e voltar de outra página não reinicia tudo.
 *
 * - "push": cada mudança vira uma entrada do histórico (trocar de lista, abrir
 *   pasta). O "Voltar" passa por elas.
 * - "replace": atualiza a entrada atual (aba Quadro/Tabela) — lembrada ao
 *   voltar, mas sem entupir o histórico.
 */
export function useQueryParams(): {
  get: (key: string) => string | null;
  update: (patch: QueryPatch, mode?: "push" | "replace") => void;
} {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const update = useCallback(
    (patch: QueryPatch, mode: "push" | "replace" = "push"): void => {
      const current = window.location.search.replace(/^\?/, "");
      const next = applyQueryPatch(current, patch);
      if (next === current) return;
      const url = next ? `${pathname}?${next}` : pathname;
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [pathname],
  );

  return { get: (key) => searchParams.get(key), update };
}
