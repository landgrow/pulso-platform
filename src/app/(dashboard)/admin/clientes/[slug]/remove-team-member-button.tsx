"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { removeTeamMember } from "@/app/actions/clientes";
import { toast } from "sonner";
import { Loader2, UserMinus } from "lucide-react";

export function RemoveTeamMemberButton({
  orgId,
  userId,
  email,
}: {
  orgId: string;
  userId: string;
  email: string;
}): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [confirmNode, confirm] = useConfirm();

  const handleClick = async (): Promise<void> => {
    const ok = await confirm({
      title: `Remover o acesso de ${email}?`,
      description:
        "Essa pessoa deixa de entrar no espaço deste cliente na hora. Para voltar, precisa de um novo convite.",
      confirmLabel: "Remover acesso",
    });
    if (!ok) return;
    setIsLoading(true);
    try {
      const result = await removeTeamMember({ orgId, userId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Acesso removido");
      router.refresh();
    } catch {
      toast.error("Erro ao remover acesso.");
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
          <UserMinus className="h-3.5 w-3.5" />
        )}
      </Button>
      {confirmNode}
    </>
  );
}
