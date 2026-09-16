"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { consumeAuthRedirect } from "@/lib/auth/consume-auth-redirect";
import { isPasswordSetupType } from "@/lib/auth/invite-callback";
import { Loader2 } from "lucide-react";

/**
 * O fragmento `#access_token=...&type=invite` não chega no Route Handler.
 * Esta página lê hash/`code`/`token_hash` no browser, grava a sessão e manda
 * para criar senha.
 */
function AuthConfirmContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Validando seu convite...");

  useEffect(() => {
    const next = searchParams.get("next") ?? "/reset-password";

    void (async () => {
      const { ok, type } = await consumeAuthRedirect();
      if (!ok) {
        setMessage("Este link expirou ou já foi usado.");
        router.replace(
          `/login?error=${encodeURIComponent("Link de convite inválido ou expirado. Peça um novo acesso.")}`,
        );
        return;
      }

      const dest =
        isPasswordSetupType(type) || next.startsWith("/reset-password")
          ? "/reset-password"
          : next.startsWith("/")
            ? next
            : "/dashboard";
      router.replace(dest);
    })();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-3 text-text-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

export default function AuthConfirmPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <AuthConfirmContent />
    </Suspense>
  );
}
