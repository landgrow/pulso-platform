"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import {
  confirmFinanceCsvImport,
  previewFinanceCsvImport,
  type FinanceCsvPreview,
} from "@/app/actions/financeiro";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

type Props = {
  onImported?: () => void;
  /** Botão compacto (métricas) ou outline padrão (financeiro). */
  compact?: boolean;
};

export function FinanceCsvImport({
  onImported,
  compact = false,
}: Props): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<FinanceCsvPreview | null>(null);

  async function onFile(file: File | undefined): Promise<void> {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const result = await previewFinanceCsvImport(text);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPreview(result.data);
      setOpen(true);
      if (
        result.data.counts.new === 0 &&
        result.data.counts.duplicate === 0 &&
        result.data.counts.invalid === 0
      ) {
        toast.message("Arquivo vazio.");
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function confirm(): Promise<void> {
    if (!preview) return;
    const rows = preview.reviews
      .filter((r) => r.verdict === "new" && r.row)
      .map((r) => r.row!);
    if (rows.length === 0) {
      toast.message("Nada novo para importar.");
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      const result = await confirmFinanceCsvImport({ rows });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const { inserted, skipped } = result.data;
      toast.success(
        skipped > 0
          ? `${inserted} lançamento(s) importado(s); ${skipped} duplicado(s) ignorado(s).`
          : `${inserted} lançamento(s) importado(s).`,
      );
      setOpen(false);
      setPreview(null);
      onImported?.();
    } finally {
      setBusy(false);
    }
  }

  const sample =
    preview?.reviews.filter((r) => r.verdict !== "invalid").slice(0, 8) ?? [];

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={compact ? "h-8" : "h-9"}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileUp className="h-4 w-4" />
        )}
        Importar CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar lançamentos</DialogTitle>
            <DialogDescription>
              Colunas: data, tipo (entrada/saída), valor, descrição. Duplicatas
              (mesma data + tipo + valor + descrição) são bloqueadas.
            </DialogDescription>
          </DialogHeader>

          {preview ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-md border border-border bg-surface-2 px-2 py-3">
                  <p className="text-xs text-text-3">Novos</p>
                  <p className="text-lg font-semibold tabular-nums text-chart-in">
                    {preview.counts.new}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-surface-2 px-2 py-3">
                  <p className="text-xs text-text-3">Duplicados</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {preview.counts.duplicate}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-surface-2 px-2 py-3">
                  <p className="text-xs text-text-3">Inválidos</p>
                  <p className="text-lg font-semibold tabular-nums text-destructive">
                    {preview.counts.invalid}
                  </p>
                </div>
              </div>

              {sample.length > 0 ? (
                <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-text-2">
                  {sample.map((item, i) => (
                    <li
                      key={`${item.fingerprint}-${i}`}
                      className="flex justify-between gap-2 border-b border-border/60 py-1"
                    >
                      <span className="truncate">
                        {item.verdict === "duplicate" ? "↻ " : ""}
                        {item.row?.description}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {item.row
                          ? formatCurrency(item.row.amount)
                          : item.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || preview.counts.new === 0}
                  onClick={() => void confirm()}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Importar {preview.counts.new} novo(s)
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
