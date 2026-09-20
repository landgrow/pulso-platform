import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "@/lib/google/oauth";
import { parseDriveFileId } from "@/lib/google/drive-url";

export { parseDriveFileId };

const FOLDER_MIME = "application/vnd.google-apps.folder";

interface DriveAccount {
  id: string;
  refresh_token: string;
  root_folder_id: string | null;
}

export interface DriveConnectionPublic {
  connected: boolean;
  accountEmail: string | null;
  rootFolderId: string | null;
}

async function loadAccount(): Promise<DriveAccount | null> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("google_drive_accounts")
    .select("id, refresh_token, root_folder_id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as DriveAccount | null) ?? null;
}

export async function getDriveConnectionPublic(): Promise<DriveConnectionPublic> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("google_drive_accounts")
    .select("account_email, root_folder_id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as {
    account_email: string;
    root_folder_id: string | null;
  } | null;
  return {
    connected: Boolean(row),
    accountEmail: row?.account_email ?? null,
    rootFolderId: row?.root_folder_id ?? null,
  };
}

export async function accessToken(): Promise<string> {
  const account = await loadAccount();
  if (!account) throw new Error("Drive da Land Grow ainda não está ligado.");
  return refreshAccessToken(account.refresh_token);
}

async function driveFetch(
  token: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

export async function findOrCreateFolder(
  token: string,
  name: string,
  parentId: string | "root",
): Promise<string> {
  const q = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    `mimeType = '${FOLDER_MIME}'`,
    "trashed = false",
    parentId === "root" ? "'root' in parents" : `'${parentId}' in parents`,
  ].join(" and ");
  const search = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`,
  );
  if (search.ok) {
    const payload = (await search.json()) as { files?: { id: string }[] };
    const existing = payload.files?.[0]?.id;
    if (existing) return existing;
  }

  const created = await driveFetch(
    token,
    "https://www.googleapis.com/drive/v3/files",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: FOLDER_MIME,
        parents: parentId === "root" ? undefined : [parentId],
      }),
    },
  );
  if (!created.ok) throw new Error("Não consegui criar a pasta no Drive.");
  const file = (await created.json()) as { id: string };
  return file.id;
}

export async function ensurePulsoRoot(token: string): Promise<string> {
  const folderId = await findOrCreateFolder(token, "PULSO", "root");
  const admin = await createAdminClient();
  const account = await loadAccount();
  if (account) {
    await admin
      .from("google_drive_accounts")
      .update({
        root_folder_id: folderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);
  }
  return folderId;
}

export async function ensureOrgFolder(
  orgId: string,
  orgName: string,
): Promise<{ folderId: string; folderUrl: string }> {
  const admin = await createAdminClient();
  const { data: existing } = await admin
    .from("org_drive_folders")
    .select("folder_id, folder_url")
    .eq("org_id", orgId)
    .maybeSingle();
  if (existing) {
    const row = existing as { folder_id: string; folder_url: string | null };
    return {
      folderId: row.folder_id,
      folderUrl:
        row.folder_url ??
        `https://drive.google.com/drive/folders/${row.folder_id}`,
    };
  }

  const token = await accessToken();
  const rootId = await ensurePulsoRoot(token);
  const safeName = orgName.replace(/[\\/]/g, "-").slice(0, 80) || orgId;
  const folderId = await findOrCreateFolder(token, safeName, rootId);
  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
  await admin.from("org_drive_folders").upsert({
    org_id: orgId,
    folder_id: folderId,
    folder_url: folderUrl,
    updated_at: new Date().toISOString(),
  });
  return { folderId, folderUrl };
}

export async function uploadBufferToDrive(input: {
  token: string;
  folderId: string;
  name: string;
  mime: string;
  bytes: Buffer;
}): Promise<{ id: string; webViewLink: string }> {
  const metadata = {
    name: input.name,
    parents: [input.folderId],
  };
  const boundary = `pulso_${Date.now()}`;
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    ),
    Buffer.from(`--${boundary}\r\nContent-Type: ${input.mime}\r\n\r\n`),
    input.bytes,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const response = await driveFetch(
    input.token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!response.ok) throw new Error("Upload no Drive falhou.");
  const file = (await response.json()) as { id: string; webViewLink?: string };
  return {
    id: file.id,
    webViewLink:
      file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
  };
}

export async function getDriveFileMeta(
  token: string,
  fileId: string,
): Promise<{ name: string; mimeType: string; webViewLink: string }> {
  const response = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,webViewLink`,
  );
  if (!response.ok) throw new Error("Não achei esse arquivo no Drive.");
  const file = (await response.json()) as {
    name: string;
    mimeType?: string;
    webViewLink?: string;
  };
  return {
    name: file.name,
    mimeType: file.mimeType ?? "application/octet-stream",
    webViewLink:
      file.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
  };
}
