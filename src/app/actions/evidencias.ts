"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Evidencia, Result, ErrorCode } from "@/types/collections";
import { MAX_FILE_SIZE } from "@/lib/storage/file-validator";
import { isPlatformAdmin } from "@/lib/supabase/platform-role-server";
import { authorizePeriodo } from "@/lib/auth/org-access";

function fail<T>(error: string, code: ErrorCode): Result<T> {
  return { success: false, error, code };
}
function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const uploadEvidenciaSchema = z.object({
  id: z.string().uuid("ID de evidência inválido"),
  periodoId: z.string().uuid("ID de período inválido"),
  storagePath: z.string().min(1).max(500),
  tipo: z.enum(["pdf", "excel", "csv", "audio", "outro"]),
  nomeOriginal: z.string().min(1, "Nome do arquivo obrigatório").max(255),
  mimeType: z.string().min(1).max(150),
  tamanhoBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE, "Arquivo acima do limite de 25MB"),
  hash: z.string().length(64, "Hash SHA-256 inválido"),
});

const evidenciaIdSchema = z.object({
  evidenciaId: z.string().uuid("ID de evidência inválido"),
});

const listEvidenciasSchema = z.object({
  periodoId: z.string().uuid("ID de período inválido"),
});

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
    resource_type: "evidencia",
    resource_id: args.resourceId,
    metadata: args.metadata ?? {},
  });
  if (error) console.error("[audit] evidencia:", error.message);
}

// ─── uploadEvidencia ──────────────────────────────────────────────────────

export type UploadEvidenciaResult = Result<{ evidencia: Evidencia }>;

/**
 * Registra uma evidência já enviada ao Storage (upload no client via
 * `src/lib/storage/upload.ts`). O caminho tem que ser exatamente
 * `{orgId}/{periodoId}/{id}-…` da org dona do período — senão dava pra
 * apontar a linha pra um arquivo de outra org e ganhar acesso a ele.
 */
export async function uploadEvidencia(
  raw: unknown,
): Promise<UploadEvidenciaResult> {
  const parsed = uploadEvidenciaSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const {
    id,
    periodoId,
    storagePath,
    tipo,
    nomeOriginal,
    mimeType,
    tamanhoBytes,
    hash,
  } = parsed.data;

  const auth = await authorizePeriodo(periodoId, { write: true });
  if (!auth.ok) return fail(auth.error, "PERMISSION_DENIED");
  const { orgId, user } = auth.access;

  if (auth.periodoStatus === "fechado") {
    return fail("Período está fechado", "PERIOD_CLOSED");
  }

  if (
    !storagePath.startsWith(`${orgId}/${periodoId}/${id}-`) ||
    storagePath.includes("..")
  ) {
    return fail("Caminho do arquivo inválido", "INVALID_INPUT");
  }

  const admin = await createAdminClient();

  const { data: duplicate } = await admin
    .from("evidencias")
    .select("id, nome_original")
    .eq("periodo_id", periodoId)
    .eq("hash", hash)
    .maybeSingle();

  if (duplicate) {
    return fail(
      `Arquivo já enviado antes ("${duplicate.nome_original}")`,
      "INVALID_INPUT",
    );
  }

  const { data: inserted, error: insertError } = await admin
    .from("evidencias")
    .insert({
      id,
      periodo_id: periodoId,
      tipo,
      storage_path: storagePath,
      nome_original: nomeOriginal,
      mime_type: mimeType,
      tamanho_bytes: tamanhoBytes,
      hash,
      uploaded_by: user.id,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    return fail(
      `Erro ao registrar evidência: ${insertError?.message ?? "desconhecido"}`,
      "INTERNAL_ERROR",
    );
  }

  await logAudit({
    orgId,
    userId: user.id,
    action: "upload",
    resourceId: inserted.id,
    metadata: { nome: nomeOriginal, tamanho: tamanhoBytes, tipo },
  });

  return ok({ evidencia: inserted as Evidencia });
}

// ─── deleteEvidencia ──────────────────────────────────────────────────────

export type DeleteEvidenciaResult = Result<{ storagePath: string }>;

/** Só quem enviou o arquivo ou um platform_admin exclui. */
export async function deleteEvidencia(
  raw: unknown,
): Promise<DeleteEvidenciaResult> {
  const parsed = evidenciaIdSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "ID inválido",
      "INVALID_INPUT",
    );
  }
  const { evidenciaId } = parsed.data;

  const admin = await createAdminClient();
  const { data: evidencia } = await admin
    .from("evidencias")
    .select("id, storage_path, uploaded_by, periodo_id")
    .eq("id", evidenciaId)
    .maybeSingle();
  if (!evidencia) return fail("Evidência não encontrada", "NOT_FOUND");

  const auth = await authorizePeriodo(evidencia.periodo_id as string, {
    write: true,
  });
  if (!auth.ok) return fail(auth.error, "PERMISSION_DENIED");
  const { orgId, user } = auth.access;

  const supabase = await createClient();
  const canDelete =
    evidencia.uploaded_by === user.id || (await isPlatformAdmin(supabase));
  if (!canDelete) {
    return fail(
      "Apenas quem enviou o arquivo ou um administrador pode excluí-lo",
      "PERMISSION_DENIED",
    );
  }

  const { error: deleteError } = await admin
    .from("evidencias")
    .delete()
    .eq("id", evidenciaId);
  if (deleteError) {
    return fail(`Erro ao excluir: ${deleteError.message}`, "INTERNAL_ERROR");
  }

  await logAudit({
    orgId,
    userId: user.id,
    action: "delete",
    resourceId: evidenciaId,
  });

  return ok({ storagePath: evidencia.storage_path as string });
}

// ─── listEvidencias ───────────────────────────────────────────────────────

export type ListEvidenciasResult = Result<{ evidencias: Evidencia[] }>;

export async function listEvidencias(
  raw: unknown,
): Promise<ListEvidenciasResult> {
  const parsed = listEvidenciasSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }

  const auth = await authorizePeriodo(parsed.data.periodoId);
  if (!auth.ok) return fail(auth.error, "PERMISSION_DENIED");

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("evidencias")
    .select("*")
    .eq("periodo_id", parsed.data.periodoId)
    .order("created_at", { ascending: false });

  if (error) return fail(`Erro: ${error.message}`, "INTERNAL_ERROR");

  return ok({ evidencias: (data ?? []) as Evidencia[] });
}
