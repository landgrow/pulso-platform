"use client";

import { useCallback, useEffect, useState } from "react";
import { upsertColecao } from "@/app/actions/colecoes";
import { useAutoSave } from "@/hooks/use-auto-save";
import { FORMULARIO_BLOCOS } from "@/lib/formulario-questions";
import { calcProgresso } from "@/lib/validations/formulario";
import type { FormularioPayload } from "@/lib/validations/formulario";
import { ProgressBar } from "./progress-bar";
import { AutoSaveIndicator } from "./auto-save-indicator";
import { FormBlocoArea } from "./form-bloco-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FormularioClientProps {
  periodoId: string;
  /** Payload inicial carregado do banco (se já existir) */
  initialPayload?: Partial<FormularioPayload>;
  readOnly?: boolean;
}

export function FormularioClient({
  periodoId,
  initialPayload = {},
  readOnly = false,
}: FormularioClientProps) {
  const [values, setValues] =
    useState<Partial<FormularioPayload>>(initialPayload);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-save
  const handleSave = useCallback(
    async (payload: Partial<FormularioPayload>) => {
      const result = await upsertColecao({
        periodoId,
        tipo: "formulario",
        payload,
        metadata: { area: "formulario" },
      });
      if (!result.success) {
        toast.error("Erro ao salvar", { description: result.error });
        throw new Error(result.error); // causa o status → "error" no hook
      }
    },
    [periodoId],
  );

  const { save, status } = useAutoSave<Partial<FormularioPayload>>({
    onSave: handleSave,
    debounceMs: 1500,
  });

  // Trigger auto-save quando values mudam
  useEffect(() => {
    if (!readOnly) {
      save(values);
    }
  }, [values, readOnly, save]);

  // Handler por campo
  const handleFieldChange = useCallback((id: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    // Limpa erro do campo quando o usuário começa a digitar
    setErrors((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return prev;
    });
  }, []);

  const progresso = calcProgresso(values);
  const canMarkReady = progresso === 100 && !readOnly;

  return (
    <div className="space-y-6">
      {/* Header: progresso + indicador de save */}
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

      {/* Blocos por área */}
      <div className="space-y-4">
        {FORMULARIO_BLOCOS.map((bloco) => (
          <FormBlocoArea
            key={bloco.area}
            bloco={bloco}
            values={values}
            errors={errors}
            onChange={handleFieldChange}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* Botão "Marcar como pronto para análise" */}
      {canMarkReady && !readOnly && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={async () => {
              // TODO: chamar markReadyForAnalysis
              toast.success("Formulário completo!", {
                description:
                  "O formulário está 100% preenchido. Use o botão no painel do período para marcar como pronto para análise.",
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
