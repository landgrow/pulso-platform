"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    console.error("[app] erro não tratado:", error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-3">
          Algo deu errado
        </p>
        <h1 className="text-xl font-semibold text-text-1 text-balance">
          Não conseguimos carregar esta tela
        </h1>
        <p className="mx-auto max-w-md text-sm text-text-2">
          Tente de novo. Se continuar, avise a Land Grow
          {error.digest ? ` informando o código ${error.digest}` : ""}.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Tentar de novo
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-text-1 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
