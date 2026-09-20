"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformStaff } from "@/lib/supabase/platform-role-server";
import { driveOAuthConfigured } from "@/lib/google/oauth";
import {
  accessToken,
  ensureOrgFolder,
  getDriveConnectionPublic,
  getDriveFileMeta,
  parseDriveFileId,
  uploadBufferToDrive,
} from "@/lib/google/drive";
import { dispatchCardEvent, loadCardEventContext } from "@/lib/notify/dispatch";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const linkSchema = z.object({
  cardId: z.string().uuid(),
  url: z.string().url("Cole um link válido do Drive"),
});

async function actorName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.full_name ?? "Alguém";
}

export async function getDriveStatus(): Promise<
  Result<{
    configured: boolean;
    connected: boolean;
    accountEmail: string | null;
  }>
> {
  const supabase = await createClient();
  if (!(await isPlatformStaff(supabase))) {
    return { success: false, error: "Só a equipe Land Grow vê o Drive." };
  }
  const connection = await getDriveConnectionPublic();
  return {
    success: true,
    data: {
      configured: driveOAuthConfigured(),
      connected: connection.connected,
      accountEmail: connection.accountEmail,
    },
  };
}

export async function disconnectDrive(): Promise<Result<{ ok: true }>> {
  const supabase = await createClient();
  if (!(await isPlatformStaff(supabase))) {
    return { success: false, error: "Só a equipe Land Grow desliga o Drive." };
  }
  const admin = await createAdminClient();
  await admin
    .from("google_drive_accounts")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  revalidatePath("/configuracoes/integracoes");
  return { success: true, data: { ok: true } };
}

export async function openOrgDriveFolder(
  orgId: string,
): Promise<Result<{ url: string }>> {
  const parsed = z.string().uuid().safeParse(orgId);
  if (!parsed.success) return { success: false, error: "Organização inválida" };
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return { success: false, error: "Organização não encontrada" };
  try {
    const folder = await ensureOrgFolder(org.id, org.name);
    return { success: true, data: { url: folder.folderUrl } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Ligue o Drive em Configurações → Integrações.",
    };
  }
}

async function notifyFile(
  cardId: string,
  actorId: string | null,
  actorLabel: string,
  fileName: string,
  fileId: string,
): Promise<void> {
  const ctx = await loadCardEventContext(cardId);
  if (!ctx) return;
  await dispatchCardEvent({
    ...ctx,
    actorId,
    actorName: actorLabel,
    kind: "arquivo",
    detail: fileName,
    entityKey: fileId,
  });
}

export async function linkDriveFileToCard(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = linkSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Link inválido",
    };
  }
  const { cardId, url } = parsed.data;
  const fileId = parseDriveFileId(url);
  if (!fileId) {
    return { success: false, error: "Esse link não parece do Google Drive." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name = "Arquivo do Drive";
  let mime: string | null = null;
  let webViewLink = url;
  try {
    const token = await accessToken();
    const meta = await getDriveFileMeta(token, fileId);
    name = meta.name;
    mime = meta.mimeType;
    webViewLink = meta.webViewLink;
  } catch {
    // Link público ou Drive ainda não ligado: grava o URL mesmo assim.
  }

  const { data, error } = await supabase
    .from("card_files")
    .insert({
      card_id: cardId,
      drive_file_id: fileId,
      name,
      mime_type: mime,
      web_view_link: webViewLink,
      uploaded_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Não consegui anexar o arquivo.",
    };
  }

  const label = user ? await actorName(supabase, user.id) : "Alguém";
  void notifyFile(cardId, user?.id ?? null, label, name, data.id);
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: data.id } };
}

export async function uploadCardFile(
  formData: FormData,
): Promise<Result<{ id: string; url: string }>> {
  const cardId = String(formData.get("cardId") ?? "");
  const file = formData.get("file");
  if (!z.string().uuid().safeParse(cardId).success) {
    return { success: false, error: "Card inválido" };
  }
  if (!(file instanceof File)) {
    return { success: false, error: "Escolha um arquivo" };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      success: false,
      error: "Arquivo acima de 4 MB. Suba no Drive e cole o link no card.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctx = await loadCardEventContext(cardId);
  if (!ctx) return { success: false, error: "Card não encontrado" };

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", ctx.orgId)
    .maybeSingle();

  try {
    const folder = await ensureOrgFolder(ctx.orgId, org?.name ?? ctx.orgId);
    const token = await accessToken();
    const bytes = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadBufferToDrive({
      token,
      folderId: folder.folderId,
      name: file.name,
      mime: file.type || "application/octet-stream",
      bytes,
    });

    const { data, error } = await supabase
      .from("card_files")
      .insert({
        card_id: cardId,
        drive_file_id: uploaded.id,
        name: file.name,
        mime_type: file.type || null,
        web_view_link: uploaded.webViewLink,
        uploaded_by: user?.id ?? null,
      })
      .select("id")
      .single();
    if (error || !data) {
      return {
        success: false,
        error:
          error?.message ?? "Arquivo foi ao Drive, mas não gravei no card.",
      };
    }

    const label = user ? await actorName(supabase, user.id) : "Alguém";
    void notifyFile(cardId, user?.id ?? null, label, file.name, data.id);
    revalidatePath("/admin/atividades");
    revalidatePath("/admin/crm");
    return { success: true, data: { id: data.id, url: uploaded.webViewLink } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Ligue o Drive em Configurações → Integrações.",
    };
  }
}

export async function deleteCardFile(
  fileId: string,
): Promise<Result<{ removed: true }>> {
  const parsed = z.string().uuid().safeParse(fileId);
  if (!parsed.success) return { success: false, error: "Arquivo inválido" };
  const supabase = await createClient();
  const { error } = await supabase.from("card_files").delete().eq("id", fileId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { removed: true } };
}
