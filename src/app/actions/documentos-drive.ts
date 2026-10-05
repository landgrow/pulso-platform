"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeOrg } from "@/lib/auth/org-access";
import {
  FOLDER_PLACEHOLDER,
  decodeName,
  encodeName,
  invalidNameReason,
  parseFolder,
  uniqueName,
} from "@/lib/documentos/storage-names";

type Result<T> = { success: true; data: T } | { success: false; error: string };

/**
 * Drive de Documentos: o cliente sobe arquivos do negócio (contratos,
 * planilhas, extratos) para a Land Grow analisar. Tudo vive no Storage, em
 * `evidencias/{orgId}/documentos/...` — pastas são prefixos, sem tabela.
 */
const BUCKET = "evidencias";
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const BLOCKED_EXTENSIONS =
  /\.(exe|bat|cmd|com|msi|scr|ps1|sh|js|jar|vbs|dll|app|dmg|apk|html?|svg)$/i;

export interface DriveItem {
  kind: "folder" | "file";
  name: string;
  size: number | null;
  mimeType: string | null;
  updatedAt: string | null;
}

const folderSchema = z.object({
  orgId: z.string().uuid(),
  folder: z.string().max(1000),
});

function rootOf(orgId: string): string {
  return `${orgId}/documentos`;
}

function keyFor(orgId: string, segments: string[]): string {
  return [rootOf(orgId), ...segments.map(encodeName)].join("/");
}

type Admin = Awaited<ReturnType<typeof createAdminClient>>;

async function authorize(
  orgId: string,
  folder: string,
  write: boolean,
): Promise<{ ok: true; segments: string[] } | { ok: false; error: string }> {
  const segments = parseFolder(folder);
  if (!segments) return { ok: false, error: "Pasta inválida." };
  const auth = await authorizeOrg(orgId, { write });
  if (!auth.ok) return { ok: false, error: auth.error };
  return { ok: true, segments };
}

async function listRaw(admin: Admin, prefix: string) {
  const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  return { data: data ?? [], error };
}

/** Todas as chaves de arquivo debaixo de um prefixo (para excluir/renomear pasta). */
async function listKeysDeep(admin: Admin, prefix: string): Promise<string[]> {
  const { data } = await listRaw(admin, prefix);
  const keys: string[] = [];
  for (const entry of data) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id === null) keys.push(...(await listKeysDeep(admin, path)));
    else keys.push(path);
  }
  return keys;
}

async function takenNames(admin: Admin, prefix: string): Promise<Set<string>> {
  const { data } = await listRaw(admin, prefix);
  return new Set(data.map((e) => decodeName(e.name)));
}

export async function listDriveFolder(
  raw: unknown,
): Promise<Result<{ items: DriveItem[]; canWrite: boolean }>> {
  const parsed = folderSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Pasta inválida." };
  const { orgId, folder } = parsed.data;
  const segments = parseFolder(folder);
  if (!segments) return { success: false, error: "Pasta inválida." };
  const auth = await authorizeOrg(orgId);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  const { data, error } = await listRaw(admin, keyFor(orgId, segments));
  if (error) return { success: false, error: "Não consegui abrir a pasta." };

  const items: DriveItem[] = data
    .filter(
      (e) =>
        e.name !== FOLDER_PLACEHOLDER && e.name !== ".emptyFolderPlaceholder",
    )
    .map((e) => {
      const meta = e.metadata as { size?: number; mimetype?: string } | null;
      return e.id === null
        ? {
            kind: "folder" as const,
            name: decodeName(e.name),
            size: null,
            mimeType: null,
            updatedAt: null,
          }
        : {
            kind: "file" as const,
            name: decodeName(e.name),
            size: typeof meta?.size === "number" ? meta.size : null,
            mimeType: meta?.mimetype ?? null,
            updatedAt: e.updated_at ?? e.created_at,
          };
    })
    .sort((a, b) =>
      a.kind === b.kind
        ? a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
        : a.kind === "folder"
          ? -1
          : 1,
    );

  return {
    success: true,
    data: { items, canWrite: auth.access.canWrite },
  };
}

export async function createDriveFolder(
  raw: unknown,
): Promise<Result<{ name: string }>> {
  const parsed = folderSchema.extend({ name: z.string() }).safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };
  const { orgId, folder } = parsed.data;
  const name = parsed.data.name.trim();
  const reason = invalidNameReason(name);
  if (reason) return { success: false, error: reason };
  const auth = await authorize(orgId, folder, true);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  const parent = keyFor(orgId, auth.segments);
  const finalName = uniqueName(name, await takenNames(admin, parent));
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(
      `${keyFor(orgId, [...auth.segments, finalName])}/${FOLDER_PLACEHOLDER}`,
      new Uint8Array(0),
      { contentType: "text/plain", upsert: true },
    );
  if (error) return { success: false, error: "Não consegui criar a pasta." };
  return { success: true, data: { name: finalName } };
}

/**
 * Upload direto do navegador pro Storage (sem passar pelo servidor, que tem
 * limite de ~4 MB por requisição): aqui só autoriza e devolve a URL assinada.
 */
export async function createDriveUploadUrl(
  raw: unknown,
): Promise<Result<{ path: string; token: string; name: string }>> {
  const parsed = folderSchema
    .extend({ fileName: z.string(), size: z.number().int().nonnegative() })
    .safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };
  const { orgId, folder, size } = parsed.data;
  const fileName = parsed.data.fileName.trim();
  const reason = invalidNameReason(fileName);
  if (reason) return { success: false, error: reason };
  if (BLOCKED_EXTENSIONS.test(fileName)) {
    return { success: false, error: "Esse tipo de arquivo não é aceito." };
  }
  if (size === 0) return { success: false, error: "O arquivo está vazio." };
  if (size > MAX_FILE_BYTES) {
    return { success: false, error: "Arquivo maior que 50 MB." };
  }
  const auth = await authorize(orgId, folder, true);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  const parent = keyFor(orgId, auth.segments);
  const finalName = uniqueName(fileName, await takenNames(admin, parent));
  const path = keyFor(orgId, [...auth.segments, finalName]);
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    return { success: false, error: "Não consegui preparar o envio." };
  }
  return {
    success: true,
    data: { path: data.path, token: data.token, name: finalName },
  };
}

export async function getDriveFileUrl(
  raw: unknown,
): Promise<Result<{ url: string }>> {
  const parsed = folderSchema.extend({ name: z.string() }).safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };
  const { orgId, folder, name } = parsed.data;
  if (invalidNameReason(name)) {
    return { success: false, error: "Arquivo inválido." };
  }
  const auth = await authorize(orgId, folder, false);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(keyFor(orgId, [...auth.segments, name]), 300, {
      download: name,
    });
  if (error || !data) {
    return { success: false, error: "Arquivo não encontrado." };
  }
  return { success: true, data: { url: data.signedUrl } };
}

const itemSchema = folderSchema.extend({
  name: z.string(),
  kind: z.enum(["folder", "file"]),
});

export async function renameDriveItem(
  raw: unknown,
): Promise<Result<{ name: string }>> {
  const parsed = itemSchema.extend({ newName: z.string() }).safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };
  const { orgId, folder, name, kind } = parsed.data;
  let newName = parsed.data.newName.trim();
  // Renomear "extrato.pdf" para "Extrato março" mantém o ".pdf".
  const oldExt = /\.[^.]+$/.exec(name)?.[0];
  if (kind === "file" && oldExt && !/\.[^.]+$/.test(newName) && newName) {
    newName += oldExt;
  }
  if (invalidNameReason(name)) {
    return { success: false, error: "Item inválido." };
  }
  const reason = invalidNameReason(newName);
  if (reason) return { success: false, error: reason };
  if (kind === "file" && BLOCKED_EXTENSIONS.test(newName)) {
    return { success: false, error: "Esse tipo de arquivo não é aceito." };
  }
  if (newName === name) return { success: true, data: { name } };
  const auth = await authorize(orgId, folder, true);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  const parent = keyFor(orgId, auth.segments);
  const taken = await takenNames(admin, parent);
  if (taken.has(newName)) {
    return { success: false, error: "Já existe um item com esse nome aqui." };
  }
  const from = keyFor(orgId, [...auth.segments, name]);
  const to = keyFor(orgId, [...auth.segments, newName]);

  const moves =
    kind === "file"
      ? [[from, to] as const]
      : (await listKeysDeep(admin, from)).map(
          (key) => [key, to + key.slice(from.length)] as const,
        );
  for (const [src, dest] of moves) {
    const { error } = await admin.storage.from(BUCKET).move(src, dest);
    if (error) return { success: false, error: "Não consegui renomear." };
  }
  return { success: true, data: { name: newName } };
}

export async function deleteDriveItem(
  raw: unknown,
): Promise<Result<{ ok: true }>> {
  const parsed = itemSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };
  const { orgId, folder, name, kind } = parsed.data;
  if (invalidNameReason(name)) {
    return { success: false, error: "Item inválido." };
  }
  const auth = await authorize(orgId, folder, true);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  const key = keyFor(orgId, [...auth.segments, name]);
  const keys = kind === "file" ? [key] : await listKeysDeep(admin, key);
  for (let i = 0; i < keys.length; i += 100) {
    const { error } = await admin.storage
      .from(BUCKET)
      .remove(keys.slice(i, i + 100));
    if (error) return { success: false, error: "Não consegui excluir." };
  }
  return { success: true, data: { ok: true } };
}
