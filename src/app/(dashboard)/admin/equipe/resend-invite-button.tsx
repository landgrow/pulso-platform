"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { resendPlatformInvite } from "@/app/actions/team";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

export function ResendInviteButton({
  email,
  name,
}: {
  email: string;
  name: string;
}): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await resendPlatformInvite(email, name);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.data.message);
    } catch {
      toast.error("Erro ao reenviar convite.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleClick()}
      disabled={isLoading}
      title="Reenviar email de acesso"
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Mail className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
