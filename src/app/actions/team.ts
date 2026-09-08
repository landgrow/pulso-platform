"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-role-server";

type Result<T> = { success: true; data: T } | { success: false; error: string };

export type PlatformTeamRole = "platform_admin" | "consultant";

export interface TeamMember {
  userId: string;
  email: string;
  fullName: string | null;
  role: PlatformTeamRole;
  assignedOrgs: { org_id: string; org_name: string }[];
}

const addTeamMemberSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(["platform_admin", "consultant"]),
});

/** Lista quem tem acesso administrativo (platform_admin/consultant). */
export async function listTeamMembers(): Promise<Result<TeamMember[]>> {
  const supabase = await createClient();
  try {
    await requirePlatformAdmin(supabase);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Acesso negado",
    };
  }

  const { data, error } = await supabase.rpc("admin_team_directory");
  if (error) return { success: false, error: error.message };

  const rows = (data ?? []) as {
    user_id: string;
    email: string;
    full_name: string | null;
    role: PlatformTeamRole;
    assigned_orgs: { org_id: string; org_name: string }[];
  }[];

  return {
    success: true,
    data: rows.map((r) => ({
      userId: r.user_id,
      email: r.email,
      fullName: r.full_name,
      role: r.role,
      assignedOrgs: r.assigned_orgs,
    })),
  };
}

/**
 * Adiciona alguém à equipe Land Grow (platform_admin ou consultant). Se o
 * email já tem conta (ex: já é consultor de outro contexto), vincula direto
 * em vez de reenviar convite.
 */
export async function addPlatformTeamMember(
  raw: unknown,
): Promise<Result<{ userId: string }>> {
  const supabase = await createClient();
  try {
    await requirePlatformAdmin(supabase);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Acesso negado",
    };
  }

  const parsed = addTeamMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  const { name, email, role } = parsed.data;
  const admin = await createAdminClient();

  let userId: string;

  const { data: created, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
    });

  if (inviteError || !created.user) {
    const msg = inviteError?.message?.toLowerCase() ?? "";
    if (
      msg.includes("already been registered") ||
      msg.includes("already registered")
    ) {
      const { data: existingId } = await supabase.rpc("find_user_id_by_email", {
        p_email: email,
      });
      if (!existingId) {
        return {
          success: false,
          error:
            "Este email já tem conta, mas não consegui localizar o usuário.",
        };
      }
      userId = existingId as string;
    } else {
      return {
        success: false,
        error: inviteError?.message ?? "Erro ao convidar usuário",
      };
    }
  } else {
    userId = created.user.id;
  }

  const { error } = await admin
    .from("platform_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id" });

  if (error) return { success: false, error: error.message };
  return { success: true, data: { userId } };
}

/** Remove alguém da equipe (perde acesso administrativo, mas não a conta em si). */
export async function removePlatformTeamMember(
  userId: string,
): Promise<Result<{ removed: true }>> {
  const supabase = await createClient();
  try {
    await requirePlatformAdmin(supabase);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Acesso negado",
    };
  }

  const { error } = await supabase
    .from("platform_roles")
    .delete()
    .eq("user_id", userId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: { removed: true } };
}

/** Atribui um cliente a um consultor (o que ele passa a enxergar). */
export async function assignConsultantOrg(
  consultantId: string,
  orgId: string,
): Promise<Result<{ assigned: true }>> {
  const supabase = await createClient();
  try {
    await requirePlatformAdmin(supabase);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Acesso negado",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("consultant_assignments").insert({
    consultant_id: consultantId,
    org_id: orgId,
    assigned_by: user?.id ?? null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data: { assigned: true } };
}

/** Remove um cliente da lista de um consultor. */
export async function unassignConsultantOrg(
  consultantId: string,
  orgId: string,
): Promise<Result<{ unassigned: true }>> {
  const supabase = await createClient();
  try {
    await requirePlatformAdmin(supabase);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Acesso negado",
    };
  }

  const { error } = await supabase
    .from("consultant_assignments")
    .delete()
    .eq("consultant_id", consultantId)
    .eq("org_id", orgId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: { unassigned: true } };
}
