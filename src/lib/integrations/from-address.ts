import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Remetente: o que a equipe gravou no hub, senão a variável de ambiente. */
export async function resolveNotifyFromEmail(): Promise<string> {
  try {
    const admin = await createAdminClient();
    const { data } = await admin
      .from("workspace_integrations")
      .select("config")
      .eq("kind", "email")
      .maybeSingle();
    const config = (data?.config ?? {}) as Record<string, unknown>;
    if (typeof config.from === "string" && config.from.includes("@")) {
      return config.from;
    }
  } catch {
    // tabela ainda não existe
  }
  return (
    process.env.NOTIFY_FROM_EMAIL ?? "PULSO Land Grow <beth.t@example.com>"
  );
}
