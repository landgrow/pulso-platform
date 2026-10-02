"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { disconnectDrive } from "@/app/actions/drive";

export function DriveConnect({
  configured,
  connected,
  accountEmail,
}: {
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
}): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [confirmNode, confirm] = useConfirm();

  async function disconnect(): Promise<void> {
    const ok = await confirm({
      title: "Desligar o Google Drive?",
      description:
        "O PULSO para de acessar o Drive conectado. Os arquivos no Drive continuam lá; para voltar, é preciso ligar e autorizar a conta de novo.",
      confirmLabel: "Desligar Drive",
    });
    if (!ok) return;
    setLoading(true);
    const result = await disconnectDrive();
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Drive desligado.");
    window.location.reload();
  }

  if (!configured) {
    return <Badge variant="outline">Falta chave Google no ambiente</Badge>;
  }

  if (connected) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="outline">{accountEmail ?? "Ligado"}</Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void disconnect()}
        >
          Desligar
        </Button>
        {confirmNode}
      </div>
    );
  }

  return (
    <Button type="button" asChild>
      <Link href="/api/integrations/google/start">Ligar Google Drive</Link>
    </Button>
  );
}
