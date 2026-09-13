"use client";

import { useState } from "react";
import { Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DiagCard } from "@/components/admin/diag-card";
import {
  BIN_ENTREGAVEIS,
  BIN_SECTORS_DEMO,
  binSectorColor,
} from "@/data/diagnostico-demo";

/** Igual ao protótipo (renderBinPage) — 10 setores com progresso de exemplo. O motor real (63 perguntas/setor) é o Épico 2. */
export function BinPageContent(): JSX.Element {
  const [entregaveisOpen, setEntregaveisOpen] = useState(false);

  const total = BIN_SECTORS_DEMO.reduce((sum, s) => sum + s.total, 0);
  const respondidas = BIN_SECTORS_DEMO.reduce(
    (sum, s) => sum + s.respondidas,
    0,
  );
  const pct = Math.round((respondidas / total) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Radar className="h-5 w-5 text-text-2" />
            Business Insights Navigator
          </h2>
          <p className="text-sm text-text-2">
            Diagnóstico dos 10 setores: RADAR, COMPASS, HORIZON, ROUTE PLANNER.
          </p>
        </div>
        <Button size="sm" onClick={() => setEntregaveisOpen(true)}>
          Ver 4 Entregáveis Oficiais
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-surface-1 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-2">Progresso do diagnóstico</span>
          <span className="font-medium">
            {respondidas} de {total} perguntas ({pct}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Os 10 setores</h3>
        <p className="text-xs text-text-2">
          Dados de exemplo — o diagnóstico completo entra no ar no Épico 2.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BIN_SECTORS_DEMO.map((s, i) => (
            <DiagCard
              key={s.name}
              index={i + 1}
              indexLabel="Área"
              color={binSectorColor(s.name)}
              title={s.name}
              meta={s.desc}
              total={s.total}
              respondidas={s.respondidas}
              countLabel="pergs."
            />
          ))}
        </div>
      </div>

      <Sheet open={entregaveisOpen} onOpenChange={setEntregaveisOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="p-0">
            <SheetTitle>Os 4 Entregáveis Oficiais do BIN</SheetTitle>
          </SheetHeader>
          <div className="divide-y divide-border">
            {BIN_ENTREGAVEIS.map((d) => (
              <div
                key={d.nome}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{d.nome}</p>
                  <p className="text-xs text-text-2 mt-0.5">{d.desc}</p>
                </div>
                <span className="text-xs text-text-2 shrink-0">
                  Em construção
                </span>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
