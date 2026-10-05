import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface Assignee {
  userId: string;
  name: string;
  email: string | null;
  /** Land Grow (admin/consultor) ou da própria organização. */
  kind: "staff" | "member";
}

type Admin = Awaited<ReturnType<typeof createAdminClient>>;

async function assigneeIds(
  admin: Admin,
  orgId: string,
): Promise<{ staffIds: Set<string>; memberIds: Set<string> }> {
  const [
    { data: org },
    { data: roles },
    { data: assigned },
    { data: members },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select("is_internal")
      .eq("id", orgId)
      .maybeSingle(),
    admin.from("platform_roles").select("user_id, role"),
    admin
      .from("consultant_assignments")
      .select("consultant_id")
      .eq("org_id", orgId),
    admin.from("memberships").select("user_id").eq("org_id", orgId),
  ]);

  const isInternal = Boolean(
    (org as { is_internal: boolean | null } | null)?.is_internal,
  );
  const assignedIds = new Set(
    ((assigned ?? []) as { consultant_id: string }[]).map(
      (a) => a.consultant_id,
    ),
  );
  const staffIds = new Set<string>();
  for (const r of (roles ?? []) as { user_id: string; role: string }[]) {
    if (
      r.role === "platform_admin" ||
      isInternal ||
      assignedIds.has(r.user_id)
    ) {
      staffIds.add(r.user_id);
    }
  }
  const memberIds = new Set(
    ((members ?? []) as { user_id: string }[])
      .map((m) => m.user_id)
      .filter((id) => !staffIds.has(id)),
  );
  return { staffIds, memberIds };
}

/** O usuário pode ser responsável por tarefas dessa org? */
export async function canBeAssignee(
  admin: Admin,
  orgId: string,
  userId: string,
): Promise<boolean> {
  const { staffIds, memberIds } = await assigneeIds(admin, orgId);
  return staffIds.has(userId) || memberIds.has(userId);
}

/**
 * Quem pode ser responsável por uma tarefa da org: toda a equipe admin da
 * Land Grow, os consultores atribuídos a essa org e todos os usuários da
 * própria org (dono e funcionários cadastrados). Na org interna da Land Grow,
 * é a equipe inteira.
 */
export async function listOrgAssignees(
  admin: Admin,
  orgId: string,
): Promise<Assignee[]> {
  const { staffIds, memberIds } = await assigneeIds(admin, orgId);

  const allIds = [...staffIds, ...memberIds];
  if (allIds.length === 0) return [];

  const [{ data: profiles }, users] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", allIds),
    Promise.all(allIds.map((id) => admin.auth.admin.getUserById(id))),
  ]);
  const nameById = new Map(
    ((profiles ?? []) as { id: string; full_name: string | null }[]).map(
      (p) => [p.id, p.full_name?.trim() || null],
    ),
  );
  const emailById = new Map(
    users.map((u) => [u.data.user?.id ?? "", u.data.user?.email ?? null]),
  );

  const result: Assignee[] = allIds.map((id) => {
    const email = emailById.get(id) ?? null;
    return {
      userId: id,
      name: nameById.get(id) ?? email ?? "Sem nome",
      email,
      kind: staffIds.has(id) ? "staff" : "member",
    };
  });
  return result.sort((a, b) =>
    a.kind === b.kind
      ? a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
      : a.kind === "staff"
        ? -1
        : 1,
  );
}
