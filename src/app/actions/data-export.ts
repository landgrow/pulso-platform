"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Exporta todos os dados pessoais do usuário logado em formato JSON.
 * Usado pela página /configuracoes/dados.
 */
export async function exportMyData(): Promise<{
  success: boolean;
  data?: ExportData;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  // Busca perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Busca organizações do usuário
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, created_at, organization:organizations(*)")
    .eq("user_id", user.id);

  const exportData: ExportData = {
    exported_at: new Date().toISOString(),
    platform: "PULSO — Land Grow",
    version: "1.0",
    user: {
      id: user.id,
      email: user.email ?? "",
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
      profile: profile ?? null,
    },
    organizations: memberships ?? [],
    audit_log: [], // disponível apenas para admins via página própria
  };

  return { success: true, data: exportData };
}

interface ExportData {
  exported_at: string;
  platform: string;
  version: string;
  user: {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
    profile: Record<string, unknown> | null;
  };
  organizations: unknown[];
  audit_log: unknown[];
}
