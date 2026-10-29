"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  applySalaChannelKit,
  getSalaCanvas,
  saveSalaCanvas,
} from "@/app/actions/sala-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SALA_KITS } from "@/lib/sala/templates";
import type { SalaCanvas } from "@/types/sala";

export function SalaCanvasStudio({
  channelId,
  canvas,
  onChange,
}: {
  channelId: string;
  canvas: SalaCanvas | null;
  onChange: (next: SalaCanvas) => void;
}): JSX.Element {
  const [title, setTitle] = useState(canvas?.title ?? "");
  const [body, setBody] = useState(canvas?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarrega o rascunho quando outro canvas é aberto
    setTitle(canvas?.title ?? "");
    setBody(canvas?.body ?? "");
  }, [canvas?.id, canvas?.title, canvas?.body]);

  async function persist(): Promise<void> {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveSalaCanvas({
        channelId,
        title: title.trim() || "Notas do canal",
        body,
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setSavedAt("Salvo");
      onChange(result.data);
      toast.success("Notas salvas.");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Não gravou as notas.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6">
      <div className="flex items-center gap-3">
        <h2 className="min-w-0 flex-1 text-lg font-semibold text-text-1">
          Notas
        </h2>
        {savedAt ? (
          <span className="shrink-0 text-xs text-text-3">{savedAt}</span>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          disabled={saving}
          onClick={() => void persist()}
        >
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
      <p className="mt-1 text-sm text-text-2">
        Combinado deste canal. Só a equipe vê.
      </p>
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      <Input
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          setSavedAt(null);
        }}
        placeholder="Título"
        className="mt-4"
      />
      <Textarea
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          setSavedAt(null);
        }}
        placeholder="Escreva o combinado deste canal."
        rows={12}
        className="mt-3 min-h-[16rem] resize-y"
      />
      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
          Modelos
        </p>
        <p className="mt-1 text-xs text-text-3">
          Preenche as notas. Se o modelo tiver tarefas, cria também no
          Rastreador.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SALA_KITS.map((kit) => (
            <button
              key={kit.id}
              type="button"
              className="rounded-lg border border-border bg-surface-1 p-3 text-left hover:bg-surface-2"
              onClick={() => {
                void (async () => {
                  const result = await applySalaChannelKit(channelId, kit.id);
                  if (!result.success) {
                    setError(result.error);
                    toast.error(result.error);
                    return;
                  }
                  const saved = await getSalaCanvas(channelId);
                  if (saved.success && saved.data) {
                    setTitle(saved.data.title);
                    setBody(saved.data.body);
                    setSavedAt("Modelo aplicado");
                    onChange(saved.data);
                    toast.success("Modelo aplicado.");
                  }
                })();
              }}
            >
              <p className="text-sm font-medium text-text-1">{kit.title}</p>
              <p className="mt-1 text-xs leading-5 text-text-3">{kit.blurb}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
