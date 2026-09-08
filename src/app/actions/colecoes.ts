"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/supabase/platform-role-server";
import type { Colecao, Result, ErrorCode } from "@/types/collections";

function fail<T>(error: string, code: ErrorCode): Result<T> {
  return { success: false, error, code };
}
function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const upsertColecaoSchema = z.object({
  periodoId: z.string().uuid("ID de período inválido"),
  tipo: z.enum(["formulario", "texto_livre", "transcricao_audio"]),
  payload: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
});

const deleteColecaoSchema = z.object({
  colecaoId: z.string().uuid("ID de coleção inválido"),
});

const discardColecaoSchema = z.object({
  colecaoId: z.string().uuid("ID de coleção inválido"),
});

const restoreColecaoSchema = z.object({
  colecaoId: z.string().uuid("ID de coleção inválido"),
  revNumber: z.number().int().positive("Número de revisão inválido"),
});

// ─── Audit log helper ─────────────────────────────────────────────────────

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

// ─── upsertColecao ────────────────────────────────────────────────────────

export type UpsertColecaoResult = Result<{
  colecaoId: string;
  created: boolean;
}>;

/**
 * Cria ou atualiza uma coleção para um período.
 * Se já existe uma coleção do mesmo tipo para o período, atualiza (upsert via (periodo_id, tipo)).
 * Recusa se o período estiver fechado.
 */
export async function upsertColecao(
  raw: unknown,
): Promise<UpsertColecaoResult> {
  const parsed = upsertColecaoSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const { periodoId, tipo, payload, metadata } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  // Busca período + org para checar status e permissões
  const { data: periodo, error: pError } = await supabase
    .from("periodos_dados")
    .select("id, status, cliente_id, clientes!inner(org_id)")
    .eq("id", periodoId)
    .single();

  if (pError || !periodo) {
    return fail("Período não encontrado", "NOT_FOUND");
  }

  const clienteJoin = periodo.clientes as { org_id: string } | null;
  const orgId: string | null = Array.isArray(clienteJoin)
    ? (clienteJoin[0]?.org_id ?? null)
    : (clienteJoin?.org_id ?? null);

  if (!orgId) return fail("Organização não encontrada", "NOT_FOUND");

  // Recusa se fechado
  if (periodo.status === "fechado" || periodo.status === "analisado") {
    return fail("Período está fechado", "PERIOD_CLOSED");
  }

  // Verifica se já existe coleção do mesmo tipo
  const { data: existing } = await supabase
    .from("colecoes")
    .select("id")
    .eq("periodo_id", periodoId)
    .eq("tipo", tipo)
    .maybeSingle();

  let colecaoId: string;
  let created: boolean;

  if (existing) {
    // Atualiza existente
    const { data: updated, error: updateError } = await supabase
      .from("colecoes")
      .update({
        payload,
        metadata: metadata ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (updateError || !updated) {
      return fail(
        `Erro ao atualizar coleção: ${updateError?.message ?? "desconhecido"}`,
        "INTERNAL_ERROR",
      );
    }
    colecaoId = updated.id;
    created = false;
  } else {
    // Cria nova
    const { data: created2, error: insertError } = await supabase
      .from("colecoes")
      .insert({
        periodo_id: periodoId,
        tipo,
        payload,
        metadata: metadata ?? {},
        created_by: user.id,
        status: "rascunho",
      })
      .select("id")
      .single();

    if (insertError || !created2) {
      return fail(
        `Erro ao criar coleção: ${insertError?.message ?? "desconhecido"}`,
        "INTERNAL_ERROR",
      );
    }
    colecaoId = created2.id;
    created = true;
  }

  await logAudit(supabase, {
    orgId,
    action: created ? "create" : "update",
    resourceType: "colecao",
    resourceId: colecaoId,
    metadata: { tipo, periodo_id: periodoId },
  });

  return ok({ colecaoId, created });
}

// ─── deleteColecao ────────────────────────────────────────────────────────

export type DeleteColecaoResult = Result<{ deleted: boolean }>;

/**
 * Deleta uma coleção (apenas platform_admin ou client_owner podem deletar coleções).
 */
export async function deleteColecao(
  raw: unknown,
): Promise<DeleteColecaoResult> {
  const parsed = deleteColecaoSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "ID inválido",
      "INVALID_INPUT",
    );
  }
  const { colecaoId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  // Busca coleção + org
  const { data: colecao, error: cError } = await supabase
    .from("colecoes")
    .select(
      "id, periodo_id, periodos_dados!inner(cliente_id, clientes!inner(org_id))",
    )
    .eq("id", colecaoId)
    .single();

  if (cError || !colecao) return fail("Coleção não encontrada", "NOT_FOUND");

  const periodoJoin = colecao.periodos_dados as
    | { clientes: { org_id: string } | { org_id: string }[] }
    | { clientes: { org_id: string } | { org_id: string }[] }[]
    | null;
  const periodoObj = Array.isArray(periodoJoin) ? periodoJoin[0] : periodoJoin;
  const clienteJoin = periodoObj?.clientes;
  const orgId = Array.isArray(clienteJoin)
    ? clienteJoin[0]?.org_id
    : clienteJoin?.org_id;
  if (!orgId) return fail("Org não encontrada", "NOT_FOUND");

  // Só platform_admin pode deletar
  if (!(await isPlatformAdmin(supabase))) {
    return fail(
      "Apenas administradores podem excluir coleções",
      "PERMISSION_DENIED",
    );
  }

  const { error: deleteError } = await supabase
    .from("colecoes")
    .delete()
    .eq("id", colecaoId);

  if (deleteError) {
    return fail(`Erro ao deletar: ${deleteError.message}`, "INTERNAL_ERROR");
  }

  await logAudit(supabase, {
    orgId,
    action: "delete",
    resourceType: "colecao",
    resourceId: colecaoId,
  });

  return ok({ deleted: true });
}

// ─── discardColecao ────────────────────────────────────────────────────────

export type DiscardColecaoResult = Result<{ colecaoId: string }>;

/**
 * Marca uma coleção como descartada (soft-delete).
 * Qualquer client_member+ pode fazer.
 */
export async function discardColecao(
  raw: unknown,
): Promise<DiscardColecaoResult> {
  const parsed = discardColecaoSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "ID inválido",
      "INVALID_INPUT",
    );
  }
  const { colecaoId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  const { data: colecao, error: cError } = await supabase
    .from("colecoes")
    .select(
      "id, periodo_id, periodos_dados!inner(cliente_id, clientes!inner(org_id))",
    )
    .eq("id", colecaoId)
    .single();

  if (cError || !colecao) return fail("Coleção não encontrada", "NOT_FOUND");

  const periodoJoin = colecao.periodos_dados as
    | { clientes: { org_id: string } | { org_id: string }[] }
    | { clientes: { org_id: string } | { org_id: string }[] }[]
    | null;
  const periodoObj = Array.isArray(periodoJoin) ? periodoJoin[0] : periodoJoin;
  const clienteJoin = periodoObj?.clientes;
  const orgId = Array.isArray(clienteJoin)
    ? clienteJoin[0]?.org_id
    : clienteJoin?.org_id;

  const { error: updateError } = await supabase
    .from("colecoes")
    .update({ status: "descartado", updated_at: new Date().toISOString() })
    .eq("id", colecaoId);

  if (updateError) {
    return fail(`Erro: ${updateError.message}`, "INTERNAL_ERROR");
  }

  if (orgId) {
    await logAudit(supabase, {
      orgId,
      action: "discard",
      resourceType: "colecao",
      resourceId: colecaoId,
    });
  }

  return ok({ colecaoId });
}

// ─── getColecao ──────────────────────────────────────────────────────────

export type GetColecaoResult = Result<{ colecao: Colecao }>;

export async function getColecao(
  periodoId: string,
  tipo: Colecao["tipo"],
): Promise<GetColecaoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  const { data: colecao, error } = await supabase
    .from("colecoes")
    .select("*")
    .eq("periodo_id", periodoId)
    .eq("tipo", tipo)
    .neq("status", "descartado")
    .maybeSingle();

  if (error) return fail(`Erro: ${error.message}`, "INTERNAL_ERROR");
  if (!colecao) return fail("Coleção não encontrada", "NOT_FOUND");

  return ok({ colecao: colecao as Colecao });
}

// ─── restoreColecao ─────────────────────────────────────────────────────────

export type RestoreColecaoResult = Result<{ colecaoId: string }>;

/**
 * Restaura uma coleção para uma revision anterior. Não é destrutivo: aplica
 * o payload antigo via UPDATE normal, o que faz o trigger `trg_colecoes_archive`
 * arquivar a versão atual (pré-restore) como uma nova revision antes de
 * sobrescrever — nada em `colecao_revisions` é apagado ou reordenado.
 */
export async function restoreColecao(
  raw: unknown,
): Promise<RestoreColecaoResult> {
  const parsed = restoreColecaoSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const { colecaoId, revNumber } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  const { data: colecao, error: cError } = await supabase
    .from("colecoes")
    .select(
      "id, periodo_id, periodos_dados!inner(status, cliente_id, clientes!inner(org_id))",
    )
    .eq("id", colecaoId)
    .single();

  if (cError || !colecao) return fail("Coleção não encontrada", "NOT_FOUND");

  const periodoJoin = colecao.periodos_dados as
    | { status: string; clientes: { org_id: string } | { org_id: string }[] }
    | { status: string; clientes: { org_id: string } | { org_id: string }[] }[]
    | null;
  const periodoObj = Array.isArray(periodoJoin) ? periodoJoin[0] : periodoJoin;
  const clienteJoin = periodoObj?.clientes;
  const orgId = Array.isArray(clienteJoin)
    ? clienteJoin[0]?.org_id
    : clienteJoin?.org_id;

  if (periodoObj?.status === "fechado" || periodoObj?.status === "analisado") {
    return fail("Período está fechado", "PERIOD_CLOSED");
  }

  const { data: revision, error: revError } = await supabase
    .from("colecao_revisions")
    .select("payload, metadata")
    .eq("colecao_id", colecaoId)
    .eq("rev_number", revNumber)
    .maybeSingle();

  if (revError)
    return fail(
      `Erro ao buscar revisão: ${revError.message}`,
      "INTERNAL_ERROR",
    );
  if (!revision) return fail("Revisão não encontrada", "NOT_FOUND");

  const { error: updateError } = await supabase
    .from("colecoes")
    .update({
      payload: revision.payload,
      metadata: revision.metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", colecaoId);

  if (updateError) {
    return fail(`Erro ao restaurar: ${updateError.message}`, "INTERNAL_ERROR");
  }

  if (orgId) {
    await logAudit(supabase, {
      orgId,
      action: "restore",
      resourceType: "colecao",
      resourceId: colecaoId,
      metadata: { rev_number: revNumber },
    });
  }

  return ok({ colecaoId });
}
