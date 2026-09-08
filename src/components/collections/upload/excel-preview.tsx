"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Loader2 } from "lucide-react";

interface ExcelPreviewProps {
  signedUrl: string;
  filename: string;
}

const ROWS_PER_PAGE = 20;

/** Baixa o arquivo (Excel ou CSV) via URL assinada e renderiza a 1ª planilha em tabela paginada. */
export function ExcelPreview({ signedUrl, filename }: ExcelPreviewProps) {
  const [rows, setRows] = useState<unknown[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(signedUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = firstSheetName
          ? workbook.Sheets[firstSheetName]
          : undefined;
        if (!sheet) throw new Error("Planilha vazia");
        const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Erro ao ler o arquivo",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [signedUrl]);

  if (error) {
    return (
      <div className="rounded-md border p-4 text-sm text-destructive">
        Não foi possível ler &quot;{filename}&quot;: {error}
      </div>
    );
  }

  if (!rows) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-md border p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Carregando planilha…
      </div>
    );
  }

  const header = rows[0] ?? [];
  const body = rows.slice(1);
  const totalPages = Math.max(1, Math.ceil(body.length / ROWS_PER_PAGE));
  const pageRows = body.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              {header.map((cell, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap px-2 py-1.5 text-left font-medium"
                >
                  {String(cell ?? "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} className="border-t">
                {header.map((_, j) => (
                  <td key={j} className="whitespace-nowrap px-2 py-1.5">
                    {String(row[j] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span>
            Página {page + 1} de {totalPages} · {body.length} linhas
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
