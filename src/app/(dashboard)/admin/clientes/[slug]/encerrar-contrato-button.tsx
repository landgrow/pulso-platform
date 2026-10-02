"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { encerrarContrato } from "@/app/actions/clientes";
import { toast } from "sonner";
import { Loader2, XCircle } from "lucide-react";

export function EncerrarContratoButton({
  contratoId,
}: {
  contratoId: string;
}): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [confirmNode, confirm] = useConfirm();

  const handleClick = async (): Promise<void> => {
    const ok = await confirm({
      title: "Encerrar este contrato?",
      description:
        "O contrato passa para encerrado com data de fim hoje. Para voltar a atender, será preciso cadastrar um novo contrato.",
      confirmLabel: "Encerrar contrato",
    });
    if (!ok) return;
    setIsLoading(true);
    try {
      const result = await encerrarContrato({ contratoId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Contrato encerrado");
      router.refresh();
    } catch {
      toast.error("Erro ao encerrar contrato.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        <span className="ml-1.5">Encerrar</span>
      </Button>
      {confirmNode}
    </>
  );
}
