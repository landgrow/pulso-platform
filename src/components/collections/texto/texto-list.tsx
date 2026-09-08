"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { updateTextoLivre } from "@/app/actions/texto";
import { discardColecao } from "@/app/actions/colecoes";
import {
  TEXTO_AREAS,
  type TextoArea,
  type TextoLivrePayload,
} from "@/lib/validations/texto";
import type { Colecao } from "@/types/collections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const MIN_LENGTH = 10;
const MAX_LENGTH = 10_000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface TextoListProps {
  textos: Colecao[];
  currentUserId: string | null;
  canDeleteAny: boolean;
  readOnly?: boolean;
  onUpdated: (colecao: Colecao) => void;
  onDeleted: (colecaoId: string) => void;
}

export function TextoList({
  textos,
  currentUserId,
  canDeleteAny,
  readOnly = false,
  onUpdated,
  onDeleted,
}: TextoListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editConteudo, setEditConteudo] = useState("");
  const [editArea, setEditArea] = useState<TextoArea>("Geral");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (textos.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhum texto registrado neste período ainda.
      </p>
    );
  }

  function startEdit(colecao: Colecao) {
    const payload = colecao.payload as unknown as TextoLivrePayload;
    setEditingId(colecao.id);
    setEditConteudo(payload.conteudo);
    setEditArea(payload.area);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditConteudo("");
  }

  async function saveEdit(colecaoId: string) {
    const trimmed = editConteudo.trim().length;
    if (trimmed < MIN_LENGTH || trimmed > MAX_LENGTH) return;
    setSaving(true);
    const result = await updateTextoLivre({
      colecaoId,
      conteudo: editConteudo,
      area: editArea,
    });
    setSaving(false);
    if (!result.success) {
      toast.error("Erro ao atualizar", { description: result.error });
      return;
    }
    toast.success("Texto atualizado");
    onUpdated(result.data.colecao);
    setEditingId(null);
  }

  async function handleDelete(colecao: Colecao) {
    if (!window.confirm("Excluir este texto? Essa ação não pode ser desfeita."))
      return;
    setDeletingId(colecao.id);
    const result = await discardColecao({ colecaoId: colecao.id });
    setDeletingId(null);
    if (!result.success) {
      toast.error("Erro ao excluir", { description: result.error });
      return;
    }
    onDeleted(colecao.id);
  }

  return (
    <div className="space-y-3">
      {textos.map((colecao) => {
        const payload = colecao.payload as unknown as TextoLivrePayload;
        const isEditing = editingId === colecao.id;
        const canModify =
          !readOnly && (canDeleteAny || colecao.created_by === currentUserId);

        return (
          <div key={colecao.id} className="space-y-2 rounded-md border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {isEditing ? editArea : payload.area}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(colecao.created_at)}
                </span>
              </div>
              {canModify && !isEditing && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(colecao)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Editar texto"
                    title="Editar"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(colecao)}
                    disabled={deletingId === colecao.id}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    aria-label="Excluir texto"
                    title="Excluir"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Select
                  className="w-48"
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value as TextoArea)}
                >
                  {TEXTO_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
                <Textarea
                  value={editConteudo}
                  onChange={(e) => setEditConteudo(e.target.value)}
                  rows={5}
                  maxLength={MAX_LENGTH}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={cancelEdit}>
                    <X className="mr-1 size-3.5" /> Cancelar
                  </Button>
                  <Button
                    size="sm"
                    disabled={saving || editConteudo.trim().length < MIN_LENGTH}
                    onClick={() => saveEdit(colecao.id)}
                  >
                    <Check className="mr-1 size-3.5" />{" "}
                    {saving ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm">{payload.conteudo}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
