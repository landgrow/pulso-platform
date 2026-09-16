"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applyPlanoDeAcaoTemplate } from "@/app/actions/boards";
import { runNotificationsNow } from "@/app/actions/notify";

export function ApplyTemplateButton({
  boardId,
  boardName,
}: {
  boardId: string;
  boardName: string;
}): JSX.Element {
  const [busy, setBusy] = useState(false);

  async function onApply(): Promise<void> {
    setBusy(true);
    const result = await applyPlanoDeAcaoTemplate(boardId);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.data.addedColumns > 0
        ? `${boardName}: ${result.data.addedColumns} coluna(s) do modelo adicionadas.`
        : `${boardName} já tinha as colunas do modelo. Campo Urgência conferido.`,
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() => void onApply()}
    >
      Aplicar modelo
    </Button>
  );
}

export function RunNotificationsButton(): JSX.Element {
  const [busy, setBusy] = useState(false);

  async function onRun(): Promise<void> {
    setBusy(true);
    const result = await runNotificationsNow();
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    const { sent, skippedNoProvider, skippedDuplicate, failed } = result.data;
    if (skippedNoProvider > 0 && sent === 0) {
      toast.message(
        "Job rodou, mas falta RESEND_API_KEY no ambiente para o e-mail sair.",
      );
      return;
    }
    toast.success(
      `Avisos: ${sent} enviados, ${skippedDuplicate} já tinham ido hoje, ${failed} falhas.`,
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={busy}
      onClick={() => void onRun()}
    >
      Disparar avisos agora
    </Button>
  );
}
