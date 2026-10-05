"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffCapabilities } from "@/lib/supabase/platform-role-server";

const PAGE_SIZE = 20;

export interface AuditLogEntry {
  id: string;
  org_id: string | null;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined
  user_email?: string;
  user_name?: string;
  org_name?: string;
}

export type AuditLogResult =
  | { success: true; entries: AuditLogEntry[]; total: number; page: number }
  | { success: false; error: string };

export async function getAuditLog(page = 1): Promise<AuditLogResult> {
  const supabase = await createClient();

  const caps = await getStaffCapabilities(supabase);
  if (!caps.includes("audit_log")) {
    return { success: false, error: "Acesso negado. Apenas administradores." };
  }

  const offset = (page - 1) * PAGE_SIZE;

  // Capacidade "audit_log" já checada acima; a leitura usa o service role
  // porque audit_log.user_id aponta para auth.users (não para profiles, então
  // não dá para fazer o join embutido do PostgREST) e a RLS esconderia linhas
  // sem organização.
  const admin = await createAdminClient();
  const { data: entries, error } = await admin
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    return { success: false, error: error.message };
  }

  const { count } = await admin
    .from("audit_log")
    .select("*", { count: "exact", head: true });

  const rows = (entries ?? []) as Record<string, unknown>[];
  const userIds = [
    ...new Set(rows.map((e) => e.user_id as string | null).filter(Boolean)),
  ] as string[];
  const orgIds = [
    ...new Set(rows.map((e) => e.org_id as string | null).filter(Boolean)),
  ] as string[];

  const [profilesRes, orgsRes] = await Promise.all([
    userIds.length > 0
      ? admin.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] }),
    orgIds.length > 0
      ? admin.from("organizations").select("id, name").in("id", orgIds)
      : Promise.resolve({ data: [] }),
  ]);
  const nameByUser = new Map(
    (
      (profilesRes.data ?? []) as { id: string; full_name: string | null }[]
    ).map((p) => [p.id, p.full_name ?? undefined]),
  );
  const nameByOrg = new Map(
    ((orgsRes.data ?? []) as { id: string; name: string }[]).map((o) => [
      o.id,
      o.name,
    ]),
  );

  const mapped: AuditLogEntry[] = rows.map((e) => ({
    id: e.id as string,
    org_id: (e.org_id as string | null) ?? null,
    user_id: (e.user_id as string | null) ?? null,
    action: e.action as string,
    resource_type: (e.resource_type as string | null) ?? null,
    resource_id: (e.resource_id as string | null) ?? null,
    metadata: (e.metadata as Record<string, unknown> | null) ?? null,
    created_at: e.created_at as string,
    ...(typeof e.user_id === "string" && nameByUser.get(e.user_id)
      ? { user_name: nameByUser.get(e.user_id) as string }
      : {}),
    ...(typeof e.org_id === "string" && nameByOrg.get(e.org_id)
      ? { org_name: nameByOrg.get(e.org_id) as string }
      : {}),
  }));

  return {
    success: true,
    entries: mapped,
    total: count ?? 0,
    page,
  };
}
