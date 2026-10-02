"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/supabase/platform-role-server";
import { authorizePeriodo } from "@/lib/auth/org-access";
import type { Colecao, Result, ErrorCode } from "@/types/collections";

function fail<T>(error: string, code: ErrorCode): Result<T> {
  return { success: false, error, code };
}
function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const MAX_PAYLOAD_CHARS = 200_000;

const upsertColecaoSchema = z.object({
  periodoId: z.string().uuid("ID de período inválido"),
  tipo: z.enum(["formulario", "texto_livre", "transcricao_audio"]),
  payload: z
    .record(z.unknown())
    .refine((p) => JSON.stringify(p).length <= MAX_PAYLOAD_CHARS, {
      message: "Conteúdo grande demais",
    }),
  metadata: z.record(z.unknown()).optional(),
});

const colecaoIdSchema = z.object({
  colecaoId: z.string().uuid("ID de coleção inválido"),
});

const restoreColecaoSchema = z.object({
  colecaoId: z.string().uuid("ID de coleção inválido"),
  revNumber: z.number().int().positive("Número de revisão inválido"),
});

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function logAudit(
  db: AdminClient,
  args: {
    orgId: string;
    userId: string;
    action: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await db.from("audit_log").insert({
    org_id: args.orgId,
    user_id: args.userId,
    action: args.action,
    resource_type: "colecao",
    resource_id: args.resourceId,
    metadata: args.metadata ?? {},
  });
  if (error) console.error("[audit] Falha ao registrar:", error.message);
}

/** Acha a coleção (via admin) e autoriza o usuário na org do período dela. */
async function loadColecao(
  colecaoId: string,
  opts: { write?: boolean } = {},
): Promise<
  | {
      ok: true;
      admin: AdminClient;
      periodoId: string;
      orgId: string;
      userId: string;
      periodoStatus: string | undefined;
    }
  | { ok: false; error: string; code: ErrorCode }
> {
  const admin = await createAdminClient();
  const { data: colecao } = await admin
    .from("colecoes")
    .select("id, periodo_id")
    .eq("id", colecaoId)
    .maybeSingle();
  if (!colecao) {
    return { ok: false, error: "Coleção não encontrada", code: "NOT_FOUND" };
  }
  const auth = await authorizePeriodo(colecao.periodo_id as string, opts);
  if (!auth.ok) {
    return { ok: false, error: auth.error, code: "PERMISSION_DENIED" };
  }
  return {
    ok: true,
    admin,
    periodoId: colecao.periodo_id as string,
    orgId: auth.access.orgId,
    userId: auth.access.user.id,
    periodoStatus: auth.periodoStatus,
  };
}

function isClosed(status: string | undefined): boolean {
  return status === "fechado" || status === "analisado";
}

// ─── upsertColecao ────────────────────────────────────────────────────────

export type UpsertColecaoResult = Result<{
  colecaoId: string;
  created: boolean;
}>;

/**
 * Cria ou atualiza a coleção de um tipo num período (a mais recente, se
 * houver duplicata antiga). Recusa período fechado e acesso somente leitura.
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

  const auth = await authorizePeriodo(periodoId, { write: true });
  if (!auth.ok) {
    return fail(
      auth.error,
      auth.error === "Período não encontrado"
        ? "NOT_FOUND"
        : "PERMISSION_DENIED",
    );
  }
  const { user, orgId } = auth.access;

  if (isClosed(auth.periodoStatus)) {
    return fail("Período está fechado", "PERIOD_CLOSED");
  }

  const admin = await createAdminClient();
  const { data: existing } = await admin
    .from("colecoes")
    .select("id")
    .eq("periodo_id", periodoId)
    .eq("tipo", tipo)
    .neq("status", "descartado")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data: updated, error: updateError } = await admin
      .from("colecoes")
      .update({
        payload,
        metadata: metadata ?? {},
        updated_at: new Date().toISOString(),
        updated_by: user.id,
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
    return ok({ colecaoId: updated.id as string, created: false });
  }

  const { data: inserted, error: insertError } = await admin
    .from("colecoes")
    .insert({
      periodo_id: periodoId,
      tipo,
      payload,
      metadata: metadata ?? {},
      created_by: user.id,
      updated_by: user.id,
      status: "rascunho",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return fail(
      `Erro ao criar coleção: ${insertError?.message ?? "desconhecido"}`,
      "INTERNAL_ERROR",
    );
  }

  // Autosave grava a cada 1,5s — só audita a criação, não cada tecla.
  await logAudit(admin, {
    orgId,
    userId: user.id,
    action: "create",
    resourceId: inserted.id as string,
    metadata: { tipo, periodo_id: periodoId },
  });

  return ok({ colecaoId: inserted.id as string, created: true });
}

// ─── deleteColecao ────────────────────────────────────────────────────────

export type DeleteColecaoResult = Result<{ deleted: boolean }>;

/** Exclusão definitiva — só platform_admin. */
export async function deleteColecao(
  raw: unknown,
): Promise<DeleteColecaoResult> {
  const parsed = colecaoIdSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "ID inválido",
      "INVALID_INPUT",
    );
  }
  const { colecaoId } = parsed.data;

  const supabase = await createClient();
  if (!(await isPlatformAdmin(supabase))) {
    return fail(
      "Apenas administradores podem excluir coleções",
      "PERMISSION_DENIED",
    );
  }

  const loaded = await loadColecao(colecaoId, { write: true });
  if (!loaded.ok) return fail(loaded.error, loaded.code);

  const { error: deleteError } = await loaded.admin
    .from("colecoes")
    .delete()
    .eq("id", colecaoId);
  if (deleteError) {
    return fail(`Erro ao deletar: ${deleteError.message}`, "INTERNAL_ERROR");
  }

  await logAudit(loaded.admin, {
    orgId: loaded.orgId,
    userId: loaded.userId,
    action: "delete",
    resourceId: colecaoId,
  });

  return ok({ deleted: true });
}

// ─── discardColecao ────────────────────────────────────────────────────────

export type DiscardColecaoResult = Result<{ colecaoId: string }>;

/** Soft-delete (status descartado). Qualquer membro com escrita. */
export async function discardColecao(
  raw: unknown,
): Promise<DiscardColecaoResult> {
  const parsed = colecaoIdSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "ID inválido",
      "INVALID_INPUT",
    );
  }
  const { colecaoId } = parsed.data;

  const loaded = await loadColecao(colecaoId, { write: true });
  if (!loaded.ok) return fail(loaded.error, loaded.code);
  if (isClosed(loaded.periodoStatus)) {
    return fail("Período está fechado", "PERIOD_CLOSED");
  }

  const { data: updated, error: updateError } = await loaded.admin
    .from("colecoes")
    .update({ status: "descartado", updated_at: new Date().toISOString() })
    .eq("id", colecaoId)
    .select("id")
    .maybeSingle();

  if (updateError)
    return fail(`Erro: ${updateError.message}`, "INTERNAL_ERROR");
  if (!updated) return fail("Coleção não encontrada", "NOT_FOUND");

  await logAudit(loaded.admin, {
    orgId: loaded.orgId,
    userId: loaded.userId,
    action: "discard",
    resourceId: colecaoId,
  });

  return ok({ colecaoId });
}

// ─── getColecao ──────────────────────────────────────────────────────────

export type GetColecaoResult = Result<{ colecao: Colecao }>;

export async function getColecao(
  periodoId: string,
  tipo: Colecao["tipo"],
): Promise<GetColecaoResult> {
  if (!z.string().uuid().safeParse(periodoId).success) {
    return fail("ID de período inválido", "INVALID_INPUT");
  }
  const auth = await authorizePeriodo(periodoId);
  if (!auth.ok) {
    return fail(
      auth.error,
      auth.error === "Período não encontrado"
        ? "NOT_FOUND"
        : "PERMISSION_DENIED",
    );
  }

  const admin = await createAdminClient();
  const { data: colecao, error } = await admin
    .from("colecoes")
    .select("*")
    .eq("periodo_id", periodoId)
    .eq("tipo", tipo)
    .neq("status", "descartado")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return fail(`Erro: ${error.message}`, "INTERNAL_ERROR");
  if (!colecao) return fail("Coleção não encontrada", "NOT_FOUND");

  return ok({ colecao: colecao as Colecao });
}

// ─── restoreColecao ─────────────────────────────────────────────────────────

export type RestoreColecaoResult = Result<{ colecaoId: string }>;

/**
 * Restaura uma revision anterior via UPDATE normal — o trigger
 * `trg_colecoes_archive` arquiva a versão atual antes de sobrescrever.
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

  const loaded = await loadColecao(colecaoId, { write: true });
  if (!loaded.ok) return fail(loaded.error, loaded.code);
  if (isClosed(loaded.periodoStatus)) {
    return fail("Período está fechado", "PERIOD_CLOSED");
  }

  const { data: revision, error: revError } = await loaded.admin
    .from("colecao_revisions")
    .select("payload, metadata")
    .eq("colecao_id", colecaoId)
    .eq("rev_number", revNumber)
    .maybeSingle();

  if (revError) {
    return fail(
      `Erro ao buscar revisão: ${revError.message}`,
      "INTERNAL_ERROR",
    );
  }
  if (!revision) return fail("Revisão não encontrada", "NOT_FOUND");

  const { error: updateError } = await loaded.admin
    .from("colecoes")
    .update({
      payload: revision.payload,
      metadata: revision.metadata,
      updated_at: new Date().toISOString(),
      updated_by: loaded.userId,
    })
    .eq("id", colecaoId);

  if (updateError) {
    return fail(`Erro ao restaurar: ${updateError.message}`, "INTERNAL_ERROR");
  }

  await logAudit(loaded.admin, {
    orgId: loaded.orgId,
    userId: loaded.userId,
    action: "restore",
    resourceId: colecaoId,
    metadata: { rev_number: revNumber },
  });

  return ok({ colecaoId });
}
