"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { getBoardById, bulkCreateCards } from "@/app/actions/boards";
import type { BoardColumn } from "@/types/boards";

/** Cola uma lista de linhas e cria um card por linha na coluna escolhida — importador simples de dados. */
export function ImportPanel({
  boards,
}: {
  boards: { id: string; name: string }[];
}): JSX.Element {
  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [columnId, setColumnId] = useState("");
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!boardId) return;
    void getBoardById(boardId).then((result) => {
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const cols = [...result.data.columns].sort(
        (a, b) => a.position - b.position,
      );
      setColumns(cols);
      setColumnId(cols[0]?.id ?? "");
    });
  }, [boardId]);

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  async function handleImport(): Promise<void> {
    if (!boardId || !columnId || lines.length === 0) return;
    setImporting(true);
    const result = await bulkCreateCards({ boardId, columnId, titles: lines });
    setImporting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.data.count} card(s) criado(s).`);
    setText("");
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h2 className="text-lg font-semibold">Importar Dados</h2>
        <p className="text-sm text-text-2">
          Cole uma lista (uma tarefa por linha) e crie vários cards de uma vez
          num kanban.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-xs text-text-2">Kanban de destino</p>
          <Select value={boardId} onChange={(e) => setBoardId(e.target.value)}>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-text-2">Coluna de destino</p>
          <Select
            value={columnId}
            onChange={(e) => setColumnId(e.target.value)}
          >
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-text-2">Uma tarefa por linha</p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={
            "Validar BIN RADAR — JS Construtora\nExportar dados RS Company pro Drive\nRevisar contrato Ontech TI"
          }
        />
        <p className="text-xs text-text-2">
          {lines.length} linha(s) detectada(s).
        </p>
      </div>

      <Button
        onClick={() => void handleImport()}
        disabled={importing || !boardId || !columnId || lines.length === 0}
      >
        <Upload className="h-3.5 w-3.5 mr-1.5" />
        Importar {lines.length > 0 ? `${lines.length} card(s)` : ""}
      </Button>
    </div>
  );
}
