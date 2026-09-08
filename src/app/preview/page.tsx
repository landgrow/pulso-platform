"use client";

import dynamic from "next/dynamic";

// ssr: false — evita mismatch de hidratação: o cache-bust do iframe (ver
// preview-kanban.tsx) é gerado uma vez no client; sem isso, o valor
// calculado no server e o calculado no client nunca batem.
const PreviewKanban = dynamic(() => import("./preview-kanban"), {
  ssr: false,
});

export default function PreviewPage() {
  return <PreviewKanban />;
}
