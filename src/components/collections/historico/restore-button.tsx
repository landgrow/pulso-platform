"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { History } from "lucide-react";
import { restoreColecao } from "@/app/actions/colecoes";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface RestoreButtonProps {
  colecaoId: string;
  revNumber: number;
}

export function RestoreButton({ colecaoId, revNumber }: RestoreButtonProps) {
  const router = useRouter();
  const [restoring, setRestoring] = useState(false);
  const [confirmNode, confirm] = useConfirm();

  async function handleRestore() {
    const ok = await confirm({
      title: `Restaurar a versão rev. ${revNumber}?`,
      description:
        "Ela substitui a versão atual. A versão atual continua salva no histórico, então nada se perde.",
      confirmLabel: "Restaurar versão",
      destructive: false,
    });
    if (!ok) return;
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
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRestore}
        disabled={restoring}
      >
        <History className="mr-1 size-3.5" />
        {restoring ? "Restaurando…" : "Restaurar esta versão"}
      </Button>
      {confirmNode}
    </>
  );
}
