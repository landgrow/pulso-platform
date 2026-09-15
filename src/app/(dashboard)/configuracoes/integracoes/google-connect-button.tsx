"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export function GoogleConnectButton({
  connected,
}: {
  connected: boolean;
}): JSX.Element {
  const [loading, setLoading] = useState(false);

  async function connect(): Promise<void> {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/configuracoes/integracoes`,
        },
      });
      if (error) {
        toast.error("Não foi possível iniciar o Google.");
        setLoading(false);
      }
    } catch {
      toast.error("Não foi possível iniciar o Google.");
      setLoading(false);
    }
  }

  if (connected) {
    return <Badge variant="outline">Ligado</Badge>;
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={connect}
      disabled={loading}
    >
      Ligar Google
    </Button>
  );
}
