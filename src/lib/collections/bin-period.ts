import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface BinPeriod {
  clienteId: string;
  periodId: string;
  status: string;
}

/**
 * O BIN é um diagnóstico do cliente, não um dado mensal: ele mora no período
 * mais recente que já tem o formulário. Só quando ainda não existe nenhum é
 * que usa (ou cria) o período do mês atual. Antes disso, na virada do mês o
 * cliente via o formulário vazio e o admin "Ainda sem respostas".
 *
 * Chamar SÓ depois de autorizar o usuário na org (authorizeOrg).
 */
export async function resolveBinPeriod(
  orgId: string,
  opts: { create: boolean },
): Promise<BinPeriod | null> {
  const admin = await createAdminClient();

  const { data: cliente } = await admin
    .from("clientes")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();
  if (!cliente) return null;

  const { data: withForm } = await admin
    .from("colecoes")
    .select("updated_at, periodos_dados!inner(id, status, cliente_id)")
    .eq("tipo", "formulario")
    .neq("status", "descartado")
    .eq("periodos_dados.cliente_id", cliente.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const joined = (
    withForm as {
      periodos_dados?:
        { id: string; status: string } | { id: string; status: string }[];
    } | null
  )?.periodos_dados;
  const existing = Array.isArray(joined) ? joined[0] : joined;
  if (existing) {
    return {
      clienteId: cliente.id,
      periodId: existing.id,
      status: existing.status,
    };
  }

  const now = new Date();
  const mes = now.getMonth() + 1;
  const ano = now.getFullYear();
  const { data: current } = await admin
    .from("periodos_dados")
    .select("id, status")
    .eq("cliente_id", cliente.id)
    .eq("mes", mes)
    .eq("ano", ano)
    .maybeSingle();
  if (current) {
    return {
      clienteId: cliente.id,
      periodId: current.id,
      status: current.status,
    };
  }
  if (!opts.create) return null;

  const { data: created, error } = await admin
    .from("periodos_dados")
    .insert({ cliente_id: cliente.id, mes, ano, status: "em_coleta" })
    .select("id, status")
    .single();
  if (error || !created) {
    // Outra aba pode ter criado o mesmo período no meio tempo.
    const { data: raced } = await admin
      .from("periodos_dados")
      .select("id, status")
      .eq("cliente_id", cliente.id)
      .eq("mes", mes)
      .eq("ano", ano)
      .maybeSingle();
    return raced
      ? { clienteId: cliente.id, periodId: raced.id, status: raced.status }
      : null;
  }
  return {
    clienteId: cliente.id,
    periodId: created.id,
    status: created.status,
  };
}
