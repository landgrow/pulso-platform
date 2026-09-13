"use client";

import { useState } from "react";
import { Briefcase } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DiagCard } from "@/components/admin/diag-card";
import {
  diagStatusKey,
  DIAG_STATUS_LABELS,
  MIN_BLOCKS,
  type MinBlockDemo,
} from "@/data/diagnostico-demo";

/** Igual ao protótipo (renderMinPage) — 13 blocos em 3 fases, progresso de exemplo. O preenchimento guiado é o Épico 3. */
export function MinPageContent(): JSX.Element {
  const [selected, setSelected] = useState<MinBlockDemo | null>(null);

  const allBlocos = MIN_BLOCKS.flatMap((f) => f.blocos);
  const done = allBlocos.filter(
    (b) => diagStatusKey(b.respondidas, b.total) === "concluido",
  ).length;
  const pct = Math.round((done / allBlocos.length) * 100);

  let cardIndex = 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-text-2" />
          Modelo Integrado de Negócios
        </h2>
        <p className="text-sm text-text-2">Os 13 blocos do MIN.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface-1 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-2">Conclusão Geral</span>
          <span className="font-medium">
            {done}/{allBlocos.length} Blocos ({pct}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className="text-xs text-text-2">
        Dados de exemplo — o preenchimento guiado dos blocos entra no ar no
        Épico 3.
      </p>

      {MIN_BLOCKS.map((fase) => (
        <div key={fase.fase} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{fase.fase}</h3>
            <span className="text-xs text-text-2">
              {fase.blocos.length} blocos
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fase.blocos.map((b) => {
              cardIndex++;
              return (
                <DiagCard
                  key={b.nome}
                  index={cardIndex}
                  indexLabel="Bloco"
                  color={b.color}
                  title={b.nome}
                  meta={b.tags}
                  total={b.total}
                  respondidas={b.respondidas}
                  countLabel="perguntas-guia"
                  onClick={() => setSelected(b)}
                />
              );
            })}
          </div>
        </div>
      ))}

      <Sheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent className="overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="p-0">
                <SheetTitle>{selected.nome}</SheetTitle>
              </SheetHeader>
              <p className="text-sm text-text-2">
                {
                  DIAG_STATUS_LABELS[
                    diagStatusKey(selected.respondidas, selected.total)
                  ]
                }
              </p>
              <p className="text-sm text-text-2">
                {selected.respondidas} de {selected.total} perguntas-guia
                respondidas.
              </p>
              <p className="text-sm text-text-2 leading-relaxed">
                Preenchimento guiado deste bloco chega no Épico 3 (MIN). Por
                enquanto, esta é só a visão geral do progresso.
              </p>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
