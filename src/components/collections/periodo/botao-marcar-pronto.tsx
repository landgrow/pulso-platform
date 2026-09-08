"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { markReadyForAnalysis } from "@/app/actions/periodo-status";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

interface BotaoMarcarProntoProps {
  periodId: string;
  formularioProgresso: number;
  outrasFontesCount: number;
  meetsDefaultRule: boolean;
  canOverride: boolean;
}

export function BotaoMarcarPronto({
  periodId,
  formularioProgresso,
  outrasFontesCount,
  meetsDefaultRule,
  canOverride,
}: BotaoMarcarProntoProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const enabled = meetsDefaultRule || canOverride;

  async function handleConfirm() {
    setSubmitting(true);
    const result = await markReadyForAnalysis({ periodId });
    setSubmitting(false);
    if (!result.success) {
      toast.error("Erro ao marcar como pronto", { description: result.error });
      return;
    }
    toast.success("Período marcado como pronto para análise");
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} disabled={!enabled}>
        <CheckCircle2 className="mr-1 size-4" />
        Marcar como pronto para análise
      </Button>

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Marcar período como pronto para análise?</SheetTitle>
          <SheetDescription>
            Depois disso o período ainda pode receber novas coleções, mas o time
            da Land Grow já pode começar a análise.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2 px-4 text-sm">
          <p>
            Formulário:{" "}
            <span className="font-medium">{formularioProgresso}%</span>{" "}
            {formularioProgresso === 100 ? "✓" : ""}
          </p>
          <p>
            Outras fontes (uploads, texto, áudio):{" "}
            <span className="font-medium">{outrasFontesCount}</span>
          </p>
          {!meetsDefaultRule && canOverride && (
            <p className="text-warning">
              Este período ainda não atinge a régua padrão (formulário 100% + 1
              fonte), mas você pode seguir mesmo assim como dono da organização.
            </p>
          )}
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancelar</Button>
          </SheetClose>
          <Button onClick={handleConfirm} disabled={submitting || !enabled}>
            {submitting ? "Marcando…" : "Confirmar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
