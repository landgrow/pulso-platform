"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPlatformStaff } from "@/lib/supabase/platform-role-server";
import {
  INTEGRATION_CATALOG,
  isAutomationTrigger,
  isIntegrationKind,
  type IntegrationKind,
} from "@/lib/integrations/catalog";
import { getDriveStatus } from "@/app/actions/drive";
import { getLaunchReadiness } from "@/app/actions/notify";
import { getSession } from "@/lib/supabase/get-session";
import type {
  IntegrationStatus,
  WorkspaceAutomation,
  WorkspaceIntegration,
} from "@/types/integrations";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const createIntegrationSchema = z.object({
  kind: z.string(),
  name: z.string().trim().min(2).max(80).optional(),
  from: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  webhookUrl: z.string().trim().max(500).optional(),
});

const createAutomationSchema = z.object({
  name: z.string().trim().min(3).max(80),
  trigger: z.string(),
  channel: z.enum(["email", "webhook"]),
  webhookUrl: z.string().trim().max(500).optional(),
});

async function requireStaff(): Promise<
  Result<Awaited<ReturnType<typeof createClient>>>
> {
  const supabase = await createClient();
  if (!(await isPlatformStaff(supabase))) {
    return { success: false, error: "Só a equipe Land Grow gerencia isso." };
  }
  return { success: true, data: supabase };
}

function asConfig(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export async function listWorkspaceIntegrations(): Promise<
  Result<WorkspaceIntegration[]>
> {
  const gate = await requireStaff();
  if (!gate.success) return gate;
  const { data, error } = await gate.data
    .from("workspace_integrations")
    .select("id, kind, name, status, config, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    if (error.message.includes("workspace_integrations")) {
      return { success: true, data: [] };
    }
    return { success: false, error: error.message };
  }
  return {
    success: true,
    data: (data ?? []).map(
      (row: {
        id: string;
        kind: string;
        name: string;
        status: string;
        config: unknown;
        created_at: string;
      }) => ({
        id: row.id,
        kind: row.kind as WorkspaceIntegration["kind"],
        name: row.name,
        status: row.status as IntegrationStatus,
        config: asConfig(row.config),
        created_at: row.created_at,
      }),
    ),
  };
}

export async function listWorkspaceAutomations(): Promise<
  Result<WorkspaceAutomation[]>
> {
  const gate = await requireStaff();
  if (!gate.success) return gate;
  const { data, error } = await gate.data
    .from("workspace_event_automations")
    .select("id, name, trigger, channel, enabled, config, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    if (error.message.includes("workspace_event_automations")) {
      return { success: true, data: [] };
    }
    return { success: false, error: error.message };
  }
  return {
    success: true,
    data: (data ?? []).map(
      (row: {
        id: string;
        name: string;
        trigger: string;
        channel: string;
        enabled: boolean;
        config: unknown;
        created_at: string;
      }) => ({
        id: row.id,
        name: row.name,
        trigger: row.trigger as WorkspaceAutomation["trigger"],
        channel: row.channel as WorkspaceAutomation["channel"],
        enabled: Boolean(row.enabled),
        config: asConfig(row.config),
        created_at: row.created_at,
      }),
    ),
  };
}

export async function getIntegrationsHub(): Promise<
  Result<{
    integrations: WorkspaceIntegration[];
    automations: WorkspaceAutomation[];
    emailReady: boolean;
    drive: {
      configured: boolean;
      connected: boolean;
      accountEmail: string | null;
    };
    googleLogin: boolean;
  }>
> {
  const session = await getSession();
  const [integrations, automations, email, drive] = await Promise.all([
    listWorkspaceIntegrations(),
    listWorkspaceAutomations(),
    getLaunchReadiness(),
    getDriveStatus(),
  ]);
  if (!integrations.success) return integrations;
  if (!automations.success) return automations;

  return {
    success: true,
    data: {
      integrations: integrations.data,
      automations: automations.data,
      emailReady: email.success ? email.data.resend : false,
      drive: drive.success
        ? drive.data
        : { configured: false, connected: false, accountEmail: null },
      googleLogin:
        session?.user.identities?.some((i) => i.provider === "google") ?? false,
    },
  };
}

export async function createWorkspaceIntegration(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = createIntegrationSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };
  if (
    !isIntegrationKind(parsed.data.kind) ||
    parsed.data.kind === "google_login"
  ) {
    return { success: false, error: "Esse conector não se cria por aqui." };
  }
  const kind = parsed.data.kind;
  const info = INTEGRATION_CATALOG.find((item) => item.kind === kind);
  const gate = await requireStaff();
  if (!gate.success) return gate;
  const {
    data: { user },
  } = await gate.data.auth.getUser();

  const config: Record<string, string> = {};
  if (parsed.data.from) config.from = parsed.data.from;
  if (parsed.data.phone) config.phone = parsed.data.phone;
  if (parsed.data.webhookUrl) config.webhookUrl = parsed.data.webhookUrl;

  if (kind === "webhook" && !config.webhookUrl) {
    return { success: false, error: "Cole a URL do webhook." };
  }

  const singleton = kind === "email" || kind === "drive";
  const status =
    kind === "email" || kind === "webhook" ? "connected" : "pending";

  if (singleton) {
    const { data: existing } = await gate.data
      .from("workspace_integrations")
      .select("id")
      .eq("kind", kind)
      .maybeSingle();
    if (existing) {
      const { error } = await gate.data
        .from("workspace_integrations")
        .update({
          name: parsed.data.name ?? info?.name ?? kind,
          status,
          config,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) return { success: false, error: error.message };
      revalidatePath("/configuracoes/integracoes");
      return { success: true, data: { id: existing.id } };
    }
  }

  const { data, error } = await gate.data
    .from("workspace_integrations")
    .insert({
      kind,
      name: parsed.data.name ?? info?.name ?? kind,
      status,
      config,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { success: false, error: error?.message ?? "Não criou o conector." };
  }
  revalidatePath("/configuracoes/integracoes");
  return { success: true, data: { id: data.id } };
}

export async function saveEmailFrom(
  from: string,
): Promise<Result<{ id: string }>> {
  return createWorkspaceIntegration({
    kind: "email",
    name: "E-mail",
    from: from.trim(),
  });
}

export async function deleteWorkspaceIntegration(
  id: string,
): Promise<Result<{ removed: true }>> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { success: false, error: "Integração inválida." };
  const gate = await requireStaff();
  if (!gate.success) return gate;
  const { error } = await gate.data
    .from("workspace_integrations")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/configuracoes/integracoes");
  return { success: true, data: { removed: true } };
}

export async function createWorkspaceAutomation(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = createAutomationSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };
  if (!isAutomationTrigger(parsed.data.trigger)) {
    return { success: false, error: "Evento inválido." };
  }
  if (parsed.data.channel === "webhook" && !parsed.data.webhookUrl) {
    return { success: false, error: "Webhook precisa de URL." };
  }
  const gate = await requireStaff();
  if (!gate.success) return gate;
  const {
    data: { user },
  } = await gate.data.auth.getUser();
  const { data, error } = await gate.data
    .from("workspace_event_automations")
    .insert({
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      channel: parsed.data.channel,
      enabled: true,
      config: parsed.data.webhookUrl
        ? { webhookUrl: parsed.data.webhookUrl }
        : {},
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Não criou a automação.",
    };
  }
  revalidatePath("/configuracoes/integracoes");
  return { success: true, data: { id: data.id } };
}

export async function toggleWorkspaceAutomation(
  id: string,
  enabled: boolean,
): Promise<Result<{ ok: true }>> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { success: false, error: "Automação inválida." };
  const gate = await requireStaff();
  if (!gate.success) return gate;
  const { error } = await gate.data
    .from("workspace_event_automations")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/configuracoes/integracoes");
  return { success: true, data: { ok: true } };
}

export async function deleteWorkspaceAutomation(
  id: string,
): Promise<Result<{ removed: true }>> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { success: false, error: "Automação inválida." };
  const gate = await requireStaff();
  if (!gate.success) return gate;
  const { error } = await gate.data
    .from("workspace_event_automations")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/configuracoes/integracoes");
  return { success: true, data: { removed: true } };
}

export type { IntegrationKind };
