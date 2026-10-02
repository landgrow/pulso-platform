"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { encerrarCliente, reativarCliente } from "@/app/actions/clientes";
import { toast } from "sonner";
import { Loader2, PauseCircle, PlayCircle } from "lucide-react";

export function ToggleClienteStatusButton({
  orgId,
  isEncerrado,
  orgName,
}: {
  orgId: string;
  isEncerrado: boolean;
  orgName: string;
}): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [confirmNode, confirm] = useConfirm();

  const handleClick = async (): Promise<void> => {
    const ok = await confirm(
      isEncerrado
        ? {
            title: `Reativar ${orgName}?`,
            description: "O time do cliente volta a ter acesso ao sistema.",
            confirmLabel: "Reativar cliente",
            destructive: false,
          }
        : {
            title: `Encerrar ${orgName}?`,
            description:
              "Todo o time do cliente perde acesso ao sistema na hora. Dá para reativar depois.",
            confirmLabel: "Encerrar cliente",
          },
    );
    if (!ok) return;

    setIsLoading(true);
    try {
      const result = isEncerrado
        ? await reativarCliente({ orgId })
        : await encerrarCliente({ orgId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isEncerrado ? "Cliente reativado" : "Cliente encerrado");
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar status do cliente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={isEncerrado ? "outline" : "destructive"}
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : isEncerrado ? (
          <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
        ) : (
          <PauseCircle className="mr-1.5 h-3.5 w-3.5" />
        )}
        {isEncerrado ? "Reativar cliente" : "Encerrar cliente"}
      </Button>
      {confirmNode}
    </>
  );
}
