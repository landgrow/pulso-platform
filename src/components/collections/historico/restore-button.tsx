"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { History } from "lucide-react";
import { restoreColecao } from "@/app/actions/colecoes";
import { Button } from "@/components/ui/button";

interface RestoreButtonProps {
  colecaoId: string;
  revNumber: number;
}

export function RestoreButton({ colecaoId, revNumber }: RestoreButtonProps) {
  const router = useRouter();
  const [restoring, setRestoring] = useState(false);

  async function handleRestore() {
    if (
      !window.confirm(
        `Restaurar esta versão (rev. ${revNumber})? Isso vai substituir a versão atual — a versão atual também fica salva no histórico, então nada é perdido.`,
      )
    ) {
      return;
    }
    setRestoring(true);
    const result = await restoreColecao({ colecaoId, revNumber });
    setRestoring(false);
    if (!result.success) {
      toast.error("Erro ao restaurar", { description: result.error });
      return;
    }
    toast.success("Versão restaurada");
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRestore}
      disabled={restoring}
    >
      <History className="mr-1 size-3.5" />
      {restoring ? "Restaurando…" : "Restaurar esta versão"}
    </Button>
  );
}
