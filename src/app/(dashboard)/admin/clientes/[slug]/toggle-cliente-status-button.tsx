"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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

  const handleClick = async (): Promise<void> => {
    const confirmMsg = isEncerrado
      ? `Reativar ${orgName}? O time volta a ter acesso.`
      : `Encerrar ${orgName}? Todo o time perde acesso ao sistema imediatamente.`;
    if (!confirm(confirmMsg)) return;

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
  );
}
