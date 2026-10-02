"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { authorizePeriodo } from "@/lib/auth/org-access";
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

function accessCode(error: string): ErrorCode {
  return error === "Período não encontrado" ? "NOT_FOUND" : "PERMISSION_DENIED";
}

async function logAudit(args: {
  orgId: string;
  userId: string;
  action: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = await createAdminClient();
  const { error } = await admin.from("audit_log").insert({
    org_id: args.orgId,
    user_id: args.userId,
    action: args.action,
    resource_type: "colecao",
    resource_id: args.resourceId,
    metadata: args.metadata ?? {},
  });
  if (error) console.error("[audit] texto:", error.message);
}

// ─── createTextoLivre ─────────────────────────────────────────────────────

export type CreateTextoLivreResult = Result<{ colecao: Colecao }>;

/**
 * Cria uma NOVA entrada de texto livre — diferente de upsertColecao, que
 * sobrescreve a mesma linha por (periodo_id, tipo). Texto livre é uma lista
 * de entradas independentes ao longo do tempo.
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

  const auth = await authorizePeriodo(periodoId, { write: true });
  if (!auth.ok) return fail(auth.error, accessCode(auth.error));
  if (auth.periodoStatus === "fechado") {
    return fail("Período está fechado", "PERIOD_CLOSED");
  }
  const { user, orgId } = auth.access;

  const payload: TextoLivrePayload = { conteudo, area };
  const admin = await createAdminClient();
  const { data: inserted, error: insertError } = await admin
    .from("colecoes")
    .insert({
      periodo_id: periodoId,
      tipo: "texto_livre",
      payload,
      metadata: { area },
      created_by: user.id,
      updated_by: user.id,
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

  await logAudit({
    orgId,
    userId: user.id,
    action: "create",
    resourceId: inserted.id as string,
    metadata: { tipo: "texto_livre", area },
  });

  return ok({ colecao: inserted as Colecao });
}

// ─── updateTextoLivre ─────────────────────────────────────────────────────

export type UpdateTextoLivreResult = Result<{ colecao: Colecao }>;

/** Edita uma entrada de texto livre existente (por id). */
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

  const admin = await createAdminClient();
  const { data: existing } = await admin
    .from("colecoes")
    .select("id, periodo_id")
    .eq("id", colecaoId)
    .eq("tipo", "texto_livre")
    .maybeSingle();
  if (!existing) return fail("Texto não encontrado", "NOT_FOUND");

  const auth = await authorizePeriodo(existing.periodo_id as string, {
    write: true,
  });
  if (!auth.ok) return fail(auth.error, accessCode(auth.error));
  if (auth.periodoStatus === "fechado") {
    return fail("Período está fechado", "PERIOD_CLOSED");
  }
  const { user, orgId } = auth.access;

  const payload: TextoLivrePayload = { conteudo, area };
  const { data: updated, error: updateError } = await admin
    .from("colecoes")
    .update({
      payload,
      metadata: { area },
      updated_at: new Date().toISOString(),
      updated_by: user.id,
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

  await logAudit({
    orgId,
    userId: user.id,
    action: "update",
    resourceId: colecaoId,
    metadata: { tipo: "texto_livre", area },
  });

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

  const auth = await authorizePeriodo(parsed.data.periodoId);
  if (!auth.ok) return fail(auth.error, accessCode(auth.error));

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("colecoes")
    .select("*")
    .eq("periodo_id", parsed.data.periodoId)
    .eq("tipo", "texto_livre")
    .neq("status", "descartado")
    .order("created_at", { ascending: false });

  if (error) return fail(`Erro: ${error.message}`, "INTERNAL_ERROR");

  return ok({ textos: (data ?? []) as Colecao[] });
}
