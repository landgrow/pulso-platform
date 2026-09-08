"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createTextoLivre } from "@/app/actions/texto";
import { TEXTO_AREAS, type TextoArea } from "@/lib/validations/texto";
import type { Colecao } from "@/types/collections";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const MIN_LENGTH = 10;
const MAX_LENGTH = 10_000;

interface TextoFormProps {
  periodoId: string;
  onCreated: (colecao: Colecao) => void;
}

export function TextoForm({ periodoId, onCreated }: TextoFormProps) {
  const [conteudo, setConteudo] = useState("");
  const [area, setArea] = useState<TextoArea>("Geral");
  const [submitting, setSubmitting] = useState(false);

  const trimmedLength = conteudo.trim().length;
  const canSubmit =
    trimmedLength >= MIN_LENGTH && trimmedLength <= MAX_LENGTH && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const result = await createTextoLivre({ periodoId, conteudo, area });
    setSubmitting(false);
    if (!result.success) {
      toast.error("Erro ao salvar texto", { description: result.error });
      return;
    }
    toast.success("Texto salvo");
    setConteudo("");
    setArea("Geral");
    onCreated(result.data.colecao);
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium" htmlFor="texto-area">
          Área
        </label>
        <Select
          id="texto-area"
          className="w-48"
          value={area}
          onChange={(e) => setArea(e.target.value as TextoArea)}
        >
          {TEXTO_AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </div>

      <Textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        placeholder="Escreva aqui observações, contexto ou qualquer informação relevante sobre a empresa neste período…"
        rows={12}
        maxLength={MAX_LENGTH}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {trimmedLength < MIN_LENGTH
            ? `Escreva pelo menos ${MIN_LENGTH} caracteres (${trimmedLength}/${MIN_LENGTH})`
            : `${conteudo.length}/${MAX_LENGTH} caracteres`}
        </p>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? "Salvando…" : "Salvar texto"}
        </Button>
      </div>
    </div>
  );
}
