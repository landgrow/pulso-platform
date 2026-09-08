"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "evidencias";

/**
 * Sanitiza o nome original do arquivo pra virar parte segura do path no Storage.
 * Mantém extensão, troca tudo que não é alfanumérico/ponto/hífen/underscore por "_".
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-200);
}

/**
 * Monta o path de Storage no formato exigido pela policy de RLS
 * (db/migrations/0006_storage_evidencias.sql): o primeiro segmento tem que
 * ser o org_id — o resto (periodo_id/evidencia_id) não é validado pela
 * policy de INSERT, só é convenção pra organizar e pra bater com o que fica
 * gravado em `evidencias.storage_path`.
 */
export function buildStoragePath(
  orgId: string,
  periodoId: string,
  evidenciaId: string,
  filename: string,
): string {
  return `${orgId}/${periodoId}/${evidenciaId}-${sanitizeFilename(filename)}`;
}

/**
 * Envia o arquivo pro Storage usando a sessão autenticada do navegador
 * (não service_role) — a policy de RLS em storage.objects é quem decide se
 * o upload é permitido, com base no papel do usuário na org (seção 0006).
 */
export async function uploadToStorage(
  path: string,
  file: File,
): Promise<{ path: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
  if (error) throw error;
  return { path: data.path };
}

/** Gera uma URL assinada de curta duração pra download/preview. */
export async function getSignedDownloadUrl(
  path: string,
  expiresIn = 300,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/** Remove o objeto do Storage — usado tanto no delete real quanto no rollback de upload órfão. */
export async function deleteFromStorage(path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

/**
 * Faz upload com retry (backoff exponencial: 500ms, 1s, 2s) — cobre falha de
 * rede transiente sem exigir que o usuário refaça o envio manualmente.
 */
export async function uploadToStorageWithRetry(
  path: string,
  file: File,
  maxAttempts = 3,
): Promise<{ path: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await uploadToStorage(path, file);
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}
