"use server";

import { createClient } from "@/lib/supabase/server";
import { getPlatformRole } from "@/lib/supabase/platform-role-server";
import { calcProgresso } from "@/lib/validations/formulario";
import type { FormularioPayload } from "@/lib/validations/formulario";

type Result<T> = { success: true; data: T } | { success: false; error: string };

export interface BinSummary {
  clienteId: string | null;
  periodoLabel: string | null;
  progresso: number | null;
  payload: Partial<FormularioPayload> | null;
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
 * Resumo do formulário BIN (período mais recente) de UM cliente — usado
 * dentro do painel de detalhe de /admin/clientes/[slug], não como tela
 * separada (o diagnóstico do cliente mora junto com o resto dos dados dele).
 */
export async function getBinSummaryForOrg(
  orgId: string,
): Promise<Result<BinSummary>> {
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
      data: {
        clienteId: null,
        periodoLabel: null,
        progresso: null,
        payload: null,
      },
    };
  }

  const { data: periodo } = await supabase
    .from("periodos_dados")
    .select("id, mes, ano")
    .eq("cliente_id", cliente.id)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!periodo) {
    return {
      success: true,
      data: {
        clienteId: cliente.id,
        periodoLabel: null,
        progresso: null,
        payload: null,
      },
    };
  }

  const { data: colecao } = await supabase
    .from("colecoes")
    .select("payload")
    .eq("periodo_id", periodo.id)
    .eq("tipo", "formulario")
    .maybeSingle();

  const payload = (colecao?.payload as Partial<FormularioPayload>) ?? null;

  return {
    success: true,
    data: {
      clienteId: cliente.id,
      periodoLabel: `${String(periodo.mes).padStart(2, "0")}/${periodo.ano}`,
      progresso: payload ? calcProgresso(payload) : null,
      payload,
    },
  };
}
