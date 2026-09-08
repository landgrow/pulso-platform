"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Evidencia, Result, ErrorCode } from "@/types/collections";
import { MAX_FILE_SIZE } from "@/lib/storage/file-validator";
import { isPlatformAdmin } from "@/lib/supabase/platform-role-server";

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

// ─── uploadEvidencia ──────────────────────────────────────────────────────

export type UploadEvidenciaResult = Result<{ evidencia: Evidencia }>;

/**
 * Registra uma evidência já enviada ao Storage.
 * O upload em si (supabase.storage.upload) acontece no client, via
 * `src/lib/storage/upload.ts` — essa action só grava a linha depois que o
 * arquivo já está no bucket, e recusa duplicata (mesmo hash no mesmo período).
 *
 * Se essa action falhar, quem chamou deve limpar o objeto órfão no Storage
 * (ver `deleteFromStorage` em `src/lib/storage/upload.ts`).
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  // Busca período + org (pra checar status e pro audit log)
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

  if (periodo.status === "fechado") {
    return fail("Período está fechado", "PERIOD_CLOSED");
  }

  // Dedup: mesmo hash no mesmo período já foi enviado antes
  const { data: duplicate } = await supabase
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

  const { data: inserted, error: insertError } = await supabase
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

  await logAudit(supabase, {
    orgId,
    action: "upload",
    resourceType: "evidencia",
    resourceId: inserted.id,
    metadata: { nome: nomeOriginal, tamanho: tamanhoBytes, tipo },
  });

  return ok({ evidencia: inserted as Evidencia });
}

// ─── deleteEvidencia ──────────────────────────────────────────────────────

export type DeleteEvidenciaResult = Result<{ storagePath: string }>;

/**
 * Deleta o registro da evidência (o objeto no Storage é removido por quem
 * chamou, depois que este delete confirmar sucesso — ver upload-queue.tsx).
 * Permissão real é imposta pela RLS (evidencias_delete: uploader ou
 * platform_admin — ver db/migrations/0005_collections_schema.sql). Este
 * check aqui só antecipa a mensagem de erro, não substitui a RLS.
 */
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  const { data: evidencia, error: eError } = await supabase
    .from("evidencias")
    .select(
      "id, storage_path, uploaded_by, periodo_id, periodos_dados!inner(cliente_id, clientes!inner(org_id))",
    )
    .eq("id", evidenciaId)
    .single();

  if (eError || !evidencia)
    return fail("Evidência não encontrada", "NOT_FOUND");

  const periodoJoin = evidencia.periodos_dados as {
    clientes: { org_id: string } | { org_id: string }[];
  } | null;
  const clienteJoin = periodoJoin?.clientes;
  const orgId: string | null = Array.isArray(clienteJoin)
    ? (clienteJoin[0]?.org_id ?? null)
    : (clienteJoin?.org_id ?? null);

  const canDelete =
    evidencia.uploaded_by === user.id || (await isPlatformAdmin(supabase));
  if (!canDelete) {
    return fail(
      "Apenas quem enviou o arquivo ou um administrador pode excluí-lo",
      "PERMISSION_DENIED",
    );
  }

  const { error: deleteError } = await supabase
    .from("evidencias")
    .delete()
    .eq("id", evidenciaId);
  if (deleteError) {
    return fail(`Erro ao excluir: ${deleteError.message}`, "INTERNAL_ERROR");
  }

  if (orgId) {
    await logAudit(supabase, {
      orgId,
      action: "delete",
      resourceType: "evidencia",
      resourceId: evidenciaId,
    });
  }

  return ok({ storagePath: evidencia.storage_path });
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  const { data, error } = await supabase
    .from("evidencias")
    .select("*")
    .eq("periodo_id", parsed.data.periodoId)
    .order("created_at", { ascending: false });

  if (error) return fail(`Erro: ${error.message}`, "INTERNAL_ERROR");

  return ok({ evidencias: (data ?? []) as Evidencia[] });
}
