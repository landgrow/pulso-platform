"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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

  const handleClick = async (): Promise<void> => {
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
  );
}
