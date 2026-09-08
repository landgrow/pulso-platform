"use server";

import { createClient } from "@/lib/supabase/server";
import type { Colecao, Result, ErrorCode } from "@/types/collections";
import {
  createTextoLivreSchema,
  updateTextoLivreSchema,
  listTextoLivreSchema,
  type TextoLivrePayload,
} from "@/lib/validations/texto";

function fail<T>(error: string, code: ErrorCode): Result<T> {
  return { success: false, error, code };
}
function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: {
    orgId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.from("audit_log").insert({
      org_id: args.orgId,
      action: args.action,
      resource_type: args.resourceType,
      resource_id: args.resourceId,
      metadata: args.metadata ?? {},
    });
  } catch (err) {
    console.error("[audit] Falha ao registrar:", err);
  }
}

/**
 * Busca o período + org_id do cliente (usado nas 3 actions abaixo pra checar
 * status e alimentar o audit log).
 */
async function getPeriodoOrgId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  periodoId: string,
): Promise<{ status: string; orgId: string } | null> {
  const { data: periodo, error } = await supabase
    .from("periodos_dados")
    .select("status, cliente_id, clientes!inner(org_id)")
    .eq("id", periodoId)
    .single();

  if (error || !periodo) return null;

  const clienteJoin = periodo.clientes as
    { org_id: string } | { org_id: string }[] | null;
  const orgId = Array.isArray(clienteJoin)
    ? clienteJoin[0]?.org_id
    : clienteJoin?.org_id;
  if (!orgId) return null;

  return { status: periodo.status, orgId };
}

// ─── createTextoLivre ─────────────────────────────────────────────────────

export type CreateTextoLivreResult = Result<{ colecao: Colecao }>;

/**
 * Cria uma NOVA entrada de texto livre — diferente de upsertColecao
 * (src/app/actions/colecoes.ts), que atualiza a mesma linha por
 * (periodo_id, tipo). Texto livre é uma lista de entradas independentes ao
 * longo do tempo, não um rascunho único sendo sobrescrito.
 */
export async function createTextoLivre(
  raw: unknown,
): Promise<CreateTextoLivreResult> {
  const parsed = createTextoLivreSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const { periodoId, conteudo, area } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  const periodo = await getPeriodoOrgId(supabase, periodoId);
  if (!periodo) return fail("Período não encontrado", "NOT_FOUND");
  if (periodo.status === "fechado")
    return fail("Período está fechado", "PERIOD_CLOSED");

  const payload: TextoLivrePayload = { conteudo, area };

  const { data: inserted, error: insertError } = await supabase
    .from("colecoes")
    .insert({
      periodo_id: periodoId,
      tipo: "texto_livre",
      payload,
      metadata: { area },
      created_by: user.id,
      status: "validado",
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    return fail(
      `Erro ao salvar texto: ${insertError?.message ?? "desconhecido"}`,
      "INTERNAL_ERROR",
    );
  }

  await logAudit(supabase, {
    orgId: periodo.orgId,
    action: "create",
    resourceType: "colecao",
    resourceId: inserted.id,
    metadata: { tipo: "texto_livre", area },
  });

  return ok({ colecao: inserted as Colecao });
}

// ─── updateTextoLivre ─────────────────────────────────────────────────────

export type UpdateTextoLivreResult = Result<{ colecao: Colecao }>;

/** Edita uma entrada de texto livre existente (por id, não por upsert). */
export async function updateTextoLivre(
  raw: unknown,
): Promise<UpdateTextoLivreResult> {
  const parsed = updateTextoLivreSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const { colecaoId, conteudo, area } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  const { data: existing, error: fetchError } = await supabase
    .from("colecoes")
    .select(
      "id, periodo_id, periodos_dados!inner(status, cliente_id, clientes!inner(org_id))",
    )
    .eq("id", colecaoId)
    .eq("tipo", "texto_livre")
    .single();

  if (fetchError || !existing) return fail("Texto não encontrado", "NOT_FOUND");

  const periodoJoin = existing.periodos_dados as {
    status: string;
    clientes: { org_id: string } | { org_id: string }[];
  } | null;
  const clienteJoin = periodoJoin?.clientes;
  const orgId = Array.isArray(clienteJoin)
    ? clienteJoin[0]?.org_id
    : clienteJoin?.org_id;

  if (periodoJoin?.status === "fechado")
    return fail("Período está fechado", "PERIOD_CLOSED");

  const payload: TextoLivrePayload = { conteudo, area };

  const { data: updated, error: updateError } = await supabase
    .from("colecoes")
    .update({
      payload,
      metadata: { area },
      updated_at: new Date().toISOString(),
    })
    .eq("id", colecaoId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return fail(
      `Erro ao atualizar: ${updateError?.message ?? "desconhecido"}`,
      "INTERNAL_ERROR",
    );
  }

  if (orgId) {
    await logAudit(supabase, {
      orgId,
      action: "update",
      resourceType: "colecao",
      resourceId: colecaoId,
      metadata: { tipo: "texto_livre", area },
    });
  }

  return ok({ colecao: updated as Colecao });
}

// ─── listTextoLivre ───────────────────────────────────────────────────────

export type ListTextoLivreResult = Result<{ textos: Colecao[] }>;

export async function listTextoLivre(
  raw: unknown,
): Promise<ListTextoLivreResult> {
  const parsed = listTextoLivreSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  const { data, error } = await supabase
    .from("colecoes")
    .select("*")
    .eq("periodo_id", parsed.data.periodoId)
    .eq("tipo", "texto_livre")
    .neq("status", "descartado")
    .order("created_at", { ascending: false });

  if (error) return fail(`Erro: ${error.message}`, "INTERNAL_ERROR");

  return ok({ textos: (data ?? []) as Colecao[] });
}
