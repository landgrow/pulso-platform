"use server";

import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/supabase/platform-role-server";

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

  // Verifica se é platform_admin (só admins veem audit log)
  if (!(await isPlatformAdmin(supabase))) {
    return { success: false, error: "Acesso negado. Apenas administradores." };
  }

  const offset = (page - 1) * PAGE_SIZE;

  const { data: entries, error } = await supabase
    .from("audit_log")
    .select(
      `
      *,
      user:profiles!user_id(full_name),
      organization:organizations!org_id(name)
    `,
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    return { success: false, error: error.message };
  }

  const { count } = await supabase
    .from("audit_log")
    .select("*", { count: "exact", head: true });

  const mapped: AuditLogEntry[] = (entries ?? []).map(
    (e: Record<string, unknown>) => ({
      id: e.id as string,
      org_id: (e.org_id as string | null) ?? null,
      user_id: (e.user_id as string | null) ?? null,
      action: e.action as string,
      resource_type: (e.resource_type as string | null) ?? null,
      resource_id: (e.resource_id as string | null) ?? null,
      metadata: (e.metadata as Record<string, unknown> | null) ?? null,
      created_at: e.created_at as string,
      user_email: undefined,
      user_name:
        (e.user as { full_name?: string } | null)?.full_name ?? undefined,
      org_name: (e.organization as { name?: string } | null)?.name ?? undefined,
    }),
  );

  return {
    success: true,
    entries: mapped,
    total: count ?? 0,
    page,
  };
}
