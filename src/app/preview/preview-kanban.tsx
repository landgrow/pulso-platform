"use client";

import { useState } from "react";

export default function PreviewKanban() {
  // Cache-bust via inicializador preguiçoso do useState — chamar Date.now()
  // direto no corpo do componente violava a regra de pureza do React (render
  // precisa ser determinístico); a forma de função do useState é o jeito
  // sancionado de rodar algo impuro só uma vez, na primeira renderização.
  const [cacheBust] = useState(() => Date.now());

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
      }}
    >
      <iframe
        src={`/preview/kanban.html?v=${cacheBust}`}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        title="Preview Layout — Plano de Ação"
      />
    </div>
  );
}
