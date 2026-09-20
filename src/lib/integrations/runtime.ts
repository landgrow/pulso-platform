import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AutomationTrigger } from "@/lib/integrations/catalog";

export async function isEventChannelEnabled(
  trigger: AutomationTrigger,
  channel: "email" | "webhook",
): Promise<boolean> {
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("workspace_event_automations")
      .select("enabled")
      .eq("trigger", trigger)
      .eq("channel", channel);
    if (error || !data || data.length === 0) return true;
    return data.some((row) => Boolean(row.enabled));
  } catch {
    return true;
  }
}

export async function fireEventWebhooks(
  trigger: AutomationTrigger,
  payload: Record<string, string>,
): Promise<void> {
  try {
    const admin = await createAdminClient();
    const [autos, connectors] = await Promise.all([
      admin
        .from("workspace_event_automations")
        .select("config")
        .eq("trigger", trigger)
        .eq("channel", "webhook")
        .eq("enabled", true),
      admin
        .from("workspace_integrations")
        .select("config")
        .eq("kind", "webhook")
        .eq("status", "connected"),
    ]);
    const urls = new Set<string>();
    for (const row of [...(autos.data ?? []), ...(connectors.data ?? [])]) {
      const config = (row.config ?? {}) as Record<string, unknown>;
      if (
        typeof config.webhookUrl === "string" &&
        config.webhookUrl.startsWith("http")
      ) {
        urls.add(config.webhookUrl);
      }
    }
    await Promise.all(
      [...urls].map(async (url) => {
        try {
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trigger, ...payload }),
          });
        } catch (error) {
          console.error("[webhook]", url, error);
        }
      }),
    );
  } catch {
    // tabela ainda não existe
  }
}
