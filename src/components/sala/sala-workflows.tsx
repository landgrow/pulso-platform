"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  draftSalaWorkflow,
  listSalaWorkflows,
  publishSalaWorkflow,
  setSalaWorkflowEnabled,
  updateSalaWorkflow,
} from "@/app/actions/sala-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatSalaTime } from "@/lib/sala/dm";
import {
  describeAction,
  triggerFromOptionId,
  triggerOptionId,
  WORKFLOW_CHIPS,
  WORKFLOW_WHEN_OPTIONS,
  type ParsedWorkflow,
} from "@/lib/sala/workflows";
import type { SalaWorkflow } from "@/types/sala";

export function SalaWorkflows({
  channelSlug,
}: {
  channelSlug?: string;
}): JSX.Element {
  const slug = channelSlug ?? "geral";
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<ParsedWorkflow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [items, setItems] = useState<SalaWorkflow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function refresh(): Promise<void> {
    const result = await listSalaWorkflows();
    if (result.success) setItems(result.data);
    else setError(result.error);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listSalaWorkflows();
      if (cancelled) return;
      if (result.success) setItems(result.data);
      else setError(result.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function withChannel(text: string): string {
    return text.replace(/#geral/gi, `#${slug}`);
  }

  function applyChannel(parsed: ParsedWorkflow): ParsedWorkflow {
    const next: ParsedWorkflow = {
      ...parsed,
      action: { ...parsed.action, channelSlug: slug },
    };
    return next;
  }

  async function assemble(text: string): Promise<void> {
    setBusy(true);
    const result = await draftSalaWorkflow(withChannel(text));
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    setEditingId(null);
    setDraft(applyChannel(result.data.parsed));
    setError(null);
  }

  async function persistDraft(): Promise<void> {
    if (!draft) return;
    const ready: ParsedWorkflow = applyChannel({
      ...draft,
      name: draft.name.trim() || draft.action.body.slice(0, 72),
      action: {
        ...draft.action,
        body: draft.action.body.trim(),
        channelSlug: slug,
      },
    });
    if (ready.action.body.length < 3) {
      setError("Escreva o recado que o PULSO deve postar.");
      return;
    }
    setPublishing(true);
    const result = editingId
      ? await updateSalaWorkflow(editingId, ready)
      : await publishSalaWorkflow(ready, true);
    setPublishing(false);
    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    const wasEdit = Boolean(editingId);
    setDraft(null);
    setEditingId(null);
    setPrompt("");
    await refresh();
    toast.success(wasEdit ? "Fluxo atualizado." : "Fluxo ativo.");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h2 className="text-xl font-semibold text-text-1">Fluxos</h2>
      <p className="mt-1 text-sm leading-6 text-text-2">
        O PULSO posta sozinho neste canal. Escreva o recado, escolha o dia e
        ative. A checagem é todo dia às 8h (Brasília).
      </p>
      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}

      <form
        className="mt-6 space-y-3 rounded-xl border border-border bg-surface-1 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void assemble(prompt);
        }}
      >
        <p className="text-sm font-medium text-text-1">Novo fluxo</p>
        <div className="flex flex-wrap gap-1.5">
          {WORKFLOW_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="rounded-full border border-border px-2.5 py-1 text-[11px] text-text-2 hover:bg-surface-2"
              onClick={() => {
                const next = withChannel(chip.prompt);
                setPrompt(next);
                void assemble(next);
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <Input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="lembrar do resultado da semente toda segunda"
        />
        <Button type="submit" variant="outline" disabled={busy}>
          {busy ? "Montando…" : "Montar fluxo"}
        </Button>
      </form>

      {draft ? (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface-1 p-4">
          <p className="text-sm font-medium text-text-1">
            {editingId ? "Editar fluxo" : "Ajuste antes de ativar"}
          </p>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
              Nome
            </span>
            <Input
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
              Quando
            </span>
            <select
              className="flex h-10 w-full rounded-md border border-border bg-surface-1 px-3 text-sm text-text-1"
              value={triggerOptionId(draft.trigger)}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  trigger: triggerFromOptionId(event.target.value),
                })
              }
            >
              {WORKFLOW_WHEN_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
              Recado que o PULSO posta em #{slug}
            </span>
            <Textarea
              rows={4}
              value={draft.action.body}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  action: {
                    ...draft.action,
                    body: event.target.value,
                    channelSlug: slug,
                  },
                })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-text-1">
            <input
              type="checkbox"
              checked={Boolean(draft.action.useAi)}
              onChange={(event) => {
                const action = { ...draft.action, channelSlug: slug };
                if (event.target.checked) {
                  action.useAi = true;
                  action.aiPrompt = action.body;
                } else {
                  delete action.useAi;
                  delete action.aiPrompt;
                }
                setDraft({ ...draft, action });
              }}
            />
            Gerar o recado com IA (lê CRM, agenda e prazos)
          </label>
          <p className="text-xs text-text-3">{describeAction(draft.action)}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={publishing}
              onClick={() => void persistDraft()}
            >
              {publishing
                ? "Salvando…"
                : editingId
                  ? "Salvar alterações"
                  : "Ativar este fluxo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(null);
                setEditingId(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-text-1">Fluxos deste time</h3>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-text-3">
            Nenhum fluxo ainda. Escreva o recado acima ou escolha um modelo.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-1">{item.name}</p>
                  <p className="text-xs text-text-3">
                    {item.triggerLabel} → {item.actionLabel}
                    {item.enabled ? " · ativo" : " · pausado"}
                    {" · "}
                    {item.lastRunAt
                      ? `última vez ${formatSalaTime(item.lastRunAt)}`
                      : "ainda não rodou"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!item.trigger || !item.action) {
                        setError("Este fluxo não dá para editar.");
                        return;
                      }
                      setEditingId(item.id);
                      setDraft({
                        name: item.name,
                        trigger: item.trigger,
                        action: { ...item.action, channelSlug: slug },
                      });
                      setPrompt(item.prompt);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void setSalaWorkflowEnabled(item.id, !item.enabled).then(
                        () => refresh(),
                      );
                    }}
                  >
                    {item.enabled ? "Pausar" : "Ativar"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
