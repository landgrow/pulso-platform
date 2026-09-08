import "server-only";
import type { createClient } from "@/lib/supabase/server";

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
