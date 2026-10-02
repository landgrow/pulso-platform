"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { removePlatformTeamMember } from "@/app/actions/team";
import { toast } from "sonner";
import { Loader2, UserMinus } from "lucide-react";

export function RemovePlatformTeamMemberButton({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [confirmNode, confirm] = useConfirm();

  const handleClick = async (): Promise<void> => {
    const ok = await confirm({
      title: `Remover ${email} da equipe?`,
      description:
        "Essa pessoa perde o acesso administrativo da Land Grow na hora. Para voltar, precisa ser convidada de novo.",
      confirmLabel: "Remover da equipe",
    });
    if (!ok) return;
    setIsLoading(true);
    try {
      const result = await removePlatformTeamMember(userId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Removido da equipe");
      router.refresh();
    } catch {
      toast.error("Erro ao remover.");
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
