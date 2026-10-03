"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

/** Botão "Sair" sempre visível no rodapé do menu lateral. */
export function SidebarSignOut({ full }: { full: boolean }): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick(): Promise<void> {
    setBusy(true);
    const result = await signOut();
    if (!result.success) {
      setBusy(false);
      toast.error("Não consegui sair. Tente de novo.");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy}
      title="Sair da conta"
      aria-label="Sair da conta"
      className={cn(
        "inline-flex items-center gap-2 rounded-md text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        full ? "mr-auto px-2 py-1.5" : "h-8 w-8 justify-center",
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {full ? <span>Sair</span> : null}
    </button>
  );
}
