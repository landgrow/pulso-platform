import "server-only";
import type { createClient } from "@/lib/supabase/server";
import {
  STAFF_CAPABILITY_IDS,
  type StaffCapabilityId,
} from "@/lib/auth/staff-access";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type PlatformRole = "platform_admin" | "consultant";

/**
 * Papel de plataforma do usuário logado (platform_admin/consultant), lido da
 * tabela `platform_roles` — a mesma fonte usada por is_platform_admin()/
 * is_consultant() nas policies de RLS. `profiles.is_platform_admin` NÃO existe
 * no banco (confirmado no schema real) — nunca usar esse campo.
 */
export async function getPlatformRole(
  supabase: ServerSupabaseClient,
): Promise<PlatformRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("platform_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return (data?.role as PlatformRole | undefined) ?? null;
}

export async function getStaffCapabilities(
  supabase: ServerSupabaseClient,
): Promise<StaffCapabilityId[]> {
  const role = await getPlatformRole(supabase);
  if (role === "platform_admin") return [...STAFF_CAPABILITY_IDS];
  if (role !== "consultant") return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("consultant_capabilities")
    .select("capability")
    .eq("consultant_id", user.id);

  if (error || !data) return [];
  return data
    .map((row: { capability: string }) => row.capability as StaffCapabilityId)
    .filter((cap: StaffCapabilityId) => STAFF_CAPABILITY_IDS.includes(cap));
}

export async function isPlatformAdmin(
  supabase: ServerSupabaseClient,
): Promise<boolean> {
  const role = await getPlatformRole(supabase);
  return role === "platform_admin";
}

/** Lança erro se o usuário logado não for platform_admin. */
export async function requirePlatformAdmin(
  supabase: ServerSupabaseClient,
): Promise<void> {
  if (!(await isPlatformAdmin(supabase))) {
    throw new Error("Acesso negado. Apenas administradores da plataforma.");
  }
}

export async function isPlatformStaff(
  supabase: ServerSupabaseClient,
): Promise<boolean> {
  const role = await getPlatformRole(supabase);
  return role === "platform_admin" || role === "consultant";
}

/** Admin ou consultor — operação interna, sem financeiro. */
export async function requirePlatformStaff(
  supabase: ServerSupabaseClient,
): Promise<PlatformRole> {
  const role = await getPlatformRole(supabase);
  if (role !== "platform_admin" && role !== "consultant") {
    throw new Error("Acesso negado. Apenas equipe Land Grow.");
  }
  return role;
}

export async function requireCapability(
  supabase: ServerSupabaseClient,
  capability: StaffCapabilityId,
): Promise<PlatformRole> {
  const role = await getPlatformRole(supabase);
  if (role === "platform_admin") return role;
  if (role === "consultant") {
    const caps = await getStaffCapabilities(supabase);
    if (caps.includes(capability)) return role;
  }
  throw new Error("Acesso negado a esta função.");
}

export async function requireAnyCapability(
  supabase: ServerSupabaseClient,
  capabilities: StaffCapabilityId[],
): Promise<PlatformRole> {
  const role = await getPlatformRole(supabase);
  if (role === "platform_admin") return role;
  if (role === "consultant") {
    const caps = await getStaffCapabilities(supabase);
    if (capabilities.some((capability) => caps.includes(capability))) {
      return role;
    }
  }
  throw new Error("Acesso negado a esta função.");
}
