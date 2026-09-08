"use server";

import { createClient } from "@/lib/supabase/server";
import { getPlatformRole } from "@/lib/supabase/platform-role-server";

type Result<T> = { success: true; data: T } | { success: false; error: string };

export interface MinSummary {
  clienteId: string | null;
  blocosPreenchidos: number;
  ultimaAtualizacao: string | null;
}

async function requireAdminOrConsultant(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  if (!role) {
    return {
      ok: false,
      error: "Acesso negado. Apenas administradores da plataforma.",
    };
  }
  return { ok: true };
}

/**
 * Resumo do MIN (13 blocos) de UM cliente — usado dentro do painel de
 * detalhe de /admin/clientes/[slug]. Não há hoje nenhum formulário/tela que
 * crie registros em `min_blocos` (diferente do BIN, que já coleta via o
 * Motor de Coleções) — então isso sempre aparece como 0 até esse mecanismo
 * de entrada ser construído (próxima parte do Épico 3).
 */
export async function getMinSummaryForOrg(
  orgId: string,
): Promise<Result<MinSummary>> {
  const gate = await requireAdminOrConsultant();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!cliente) {
    return {
      success: true,
      data: { clienteId: null, blocosPreenchidos: 0, ultimaAtualizacao: null },
    };
  }

  const { data: blocos } = await supabase
    .from("min_blocos")
    .select("updated_at")
    .eq("cliente_id", cliente.id)
    .order("updated_at", { ascending: false });

  return {
    success: true,
    data: {
      clienteId: cliente.id,
      blocosPreenchidos: blocos?.length ?? 0,
      ultimaAtualizacao: blocos?.[0]?.updated_at ?? null,
    },
  };
}
