"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { submitMinFromClient } from "@/app/actions/min";
import { DiagCard } from "@/components/admin/diag-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MIN_BLOCK_CATALOG,
  MIN_BLOCK_META,
  MIN_FASE_LABEL,
  MIN_GUIDES,
  MIN_TOTAL_PERGUNTAS,
  type MinBlocoNome,
  type MinFase,
} from "@/lib/min/blocks";

type Answers = Record<string, Record<number, string>>;

const FASES: MinFase[] = ["fundacao", "operacao", "consolidacao"];

function answeredCount(answers: Answers, bloco: MinBlocoNome): number {
  const bag = answers[bloco] ?? {};
  return MIN_GUIDES[bloco].filter((_, i) => (bag[i] ?? "").trim().length > 0)
    .length;
}

/** MIN do cliente: 13 blocos em 3 fases, uma pergunta-guia por vez. */
export function MinWorkspace({
  slug,
  initialAnswers,
  readOnly,
}: {
  slug: string;
  initialAnswers: Answers;
  readOnly: boolean;
}): JSX.Element {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [bloco, setBloco] = useState<MinBlocoNome | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const totalRespondidas = MIN_BLOCK_CATALOG.reduce(
    (n, b) => n + answeredCount(answers, b.bloco),
    0,
  );
  const pct = Math.round((totalRespondidas / MIN_TOTAL_PERGUNTAS) * 100);

  async function persist(
    target: MinBlocoNome,
    next: Answers,
  ): Promise<boolean> {
    const catalog = MIN_BLOCK_CATALOG.find((b) => b.bloco === target);
    if (!catalog) return false;
    const perguntas = MIN_GUIDES[target]
      .map((prompt, i) => ({
        prompt,
        answer: (next[target]?.[i] ?? "").trim(),
      }))
      .filter((p) => p.answer.length > 0);
    if (perguntas.length === 0) return true;
    setSaving(true);
    const result = await submitMinFromClient({
      slug,
      bloco: catalog.nome,
      perguntas,
    });
    setSaving(false);
    if (!result.success) {
      toast.error("Não consegui salvar", { description: result.error });
      return false;
    }
    return true;
  }

  function openBlock(target: MinBlocoNome): void {
    const guides = MIN_GUIDES[target];
    const bag = answers[target] ?? {};
    const firstEmpty = guides.findIndex((_, i) => !(bag[i] ?? "").trim());
    setBloco(target);
    setStep(firstEmpty === -1 ? 0 : firstEmpty);
  }

  if (bloco) {
    const guides = MIN_GUIDES[bloco];
    const catalog = MIN_BLOCK_CATALOG.find((b) => b.bloco === bloco);
    const meta = MIN_BLOCK_META[bloco];
    const value = answers[bloco]?.[step] ?? "";
    const isLast = step === guides.length - 1;

    const setValue = (text: string): void =>
      setAnswers((prev) => ({
        ...prev,
        [bloco]: { ...(prev[bloco] ?? {}), [step]: text },
      }));

    const goNext = async (): Promise<void> => {
      const ok = await persist(bloco, answers);
      if (!ok) return;
      if (isLast) {
        toast.success(
          `${catalog?.nome ?? "Bloco"} salvo. A Land Grow já recebeu.`,
        );
        setBloco(null);
        return;
      }
      setStep((s) => s + 1);
    };

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <button
          type="button"
          onClick={() => setBloco(null)}
          className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar aos blocos
        </button>

        <div className="space-y-2">
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: meta.color }}
          >
            {catalog?.nome}
          </p>
          <div className="flex gap-1.5" aria-hidden>
            {guides.map((_, i) => (
              <span
                key={i}
                className="h-1 flex-1 rounded-full"
                style={{
                  background: i <= step ? meta.color : "var(--border)",
                  opacity: i <= step ? 1 : 0.5,
                }}
              />
            ))}
          </div>
          <p className="text-xs text-text-3 tabular-nums">
            Pergunta {step + 1} de {guides.length}
          </p>
        </div>

        <label
          htmlFor="min-answer"
          className="block text-lg font-semibold text-text-1 text-balance"
        >
          {guides[step]}
        </label>
        <Textarea
          id="min-answer"
          rows={6}
          value={value}
          disabled={readOnly}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !readOnly) {
              e.preventDefault();
              void goNext();
            }
          }}
          placeholder="Escreva com as palavras de vocês — exemplos concretos ajudam mais do que respostas perfeitas."
        />

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || saving}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Anterior
          </Button>
          {readOnly ? (
            <Button
              type="button"
              disabled={isLast}
              onClick={() => setStep((s) => s + 1)}
            >
              Próxima
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={saving}
              onClick={() => void goNext()}
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : isLast ? (
                <Check className="mr-1.5 h-4 w-4" />
              ) : null}
              {isLast ? "Concluir bloco" : "Salvar e seguir"}
              {!isLast && !saving ? (
                <ArrowRight className="ml-1.5 h-4 w-4" />
              ) : null}
            </Button>
          )}
        </div>
        {!readOnly ? (
          <p className="text-xs text-text-3">
            Ctrl + Enter salva e vai para a próxima.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 rounded-lg border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-2">Progresso do MIN</span>
          <span className="font-medium tabular-nums text-text-1">
            {totalRespondidas} de {MIN_TOTAL_PERGUNTAS} ({pct}%)
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {FASES.map((fase) => {
        const blocos = MIN_BLOCK_CATALOG.filter((b) => b.fase === fase);
        return (
          <section key={fase} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-2">
              {MIN_FASE_LABEL[fase]}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {blocos.map((b) => {
                const index = MIN_BLOCK_CATALOG.findIndex(
                  (x) => x.bloco === b.bloco,
                );
                return (
                  <DiagCard
                    key={b.bloco}
                    index={index + 1}
                    indexLabel="Bloco"
                    color={MIN_BLOCK_META[b.bloco].color}
                    title={b.nome}
                    meta={MIN_BLOCK_META[b.bloco].tags}
                    total={MIN_GUIDES[b.bloco].length}
                    respondidas={answeredCount(answers, b.bloco)}
                    countLabel="pergs."
                    onClick={() => openBlock(b.bloco)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
