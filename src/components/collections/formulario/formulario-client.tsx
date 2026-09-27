"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { upsertColecao } from "@/app/actions/colecoes";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
  BIN_V2_INSTRUMENT,
  binInstrument,
  binSectionToBloco,
  calcBinProgress,
  getBinQuestion,
  isQuestionVisible,
  parseBinAnswers,
  pruneHiddenAnswers,
} from "@/lib/bin-v2";
import type { BinAnswers } from "@/lib/bin-v2";
import { ProgressBar } from "./progress-bar";
import { AutoSaveIndicator } from "./auto-save-indicator";
import { FormBlocoArea } from "./form-bloco-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FormularioClientProps {
  periodoId: string;
  initialPayload?: Partial<BinAnswers>;
  readOnly?: boolean;
}

export function FormularioClient({
  periodoId,
  initialPayload = {},
  readOnly = false,
}: FormularioClientProps) {
  const [values, setValues] = useState<BinAnswers>(
    () => initialPayload as BinAnswers,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const blocos = useMemo(
    () => binInstrument.sections.map(binSectionToBloco),
    [],
  );

  const handleSave = useCallback(
    async (payload: BinAnswers) => {
      const pruned = pruneHiddenAnswers(payload);
      const result = await upsertColecao({
        periodoId,
        tipo: "formulario",
        payload: pruned,
        metadata: {
          area: "formulario",
          instrument: BIN_V2_INSTRUMENT,
        },
      });
      if (!result.success) {
        toast.error("Erro ao salvar", { description: result.error });
        throw new Error(result.error);
      }
    },
    [periodoId],
  );

  const { save, status } = useAutoSave<BinAnswers>({
    onSave: handleSave,
    debounceMs: 1500,
  });

  useEffect(() => {
    if (!readOnly) {
      save(values);
    }
  }, [values, readOnly, save]);

  const handleFieldChange = useCallback((id: string, value: unknown) => {
    setValues((prev) => {
      const next: BinAnswers = {
        ...prev,
        [id]: value as BinAnswers[string],
      };
      return pruneHiddenAnswers(next);
    });
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const progresso = calcBinProgress(values);
  const canMarkReady = progresso === 100 && !readOnly;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <ProgressBar percent={progresso} />
        </div>
        <AutoSaveIndicator status={status} />
      </div>

      {readOnly && (
        <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Este formulário está congelado porque o período foi fechado ou
          analisado.
        </div>
      )}

      <div className="space-y-4">
        {blocos.map((bloco, index) => (
          <FormBlocoArea
            key={bloco.area}
            bloco={bloco}
            values={values}
            errors={errors}
            onChange={handleFieldChange}
            readOnly={readOnly}
            defaultOpen={index === 0}
            isVisible={(questionId) => {
              const q = getBinQuestion(questionId);
              return q ? isQuestionVisible(q, values) : true;
            }}
          />
        ))}
      </div>

      {canMarkReady && !readOnly && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={() => {
              const parsed = parseBinAnswers(values);
              if (!parsed.success) {
                setErrors(parsed.errors);
                toast.error("Ainda falta responder alguma pergunta visível.");
                return;
              }
              toast.success("Formulário completo!", {
                description:
                  "Use o botão no painel do período para marcar como pronto para análise.",
              });
            }}
          >
            Marcar formulário como pronto
          </Button>
        </div>
      )}
    </div>
  );
}
