"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import {
  accessEmailToast,
  sendAccessEmail,
} from "@/lib/auth/send-access-email";
import {
  DEFAULT_CONSULTANT_CAPABILITIES,
  STAFF_CAPABILITY_IDS,
  isStaffCapabilityId,
  type StaffCapabilityId,
} from "@/lib/auth/staff-access";

type Result<T> = { success: true; data: T } | { success: false; error: string };

export type PlatformTeamRole = "platform_admin" | "consultant";

export interface TeamMember {
  userId: string;
  email: string;
  fullName: string | null;
  role: PlatformTeamRole;
  assignedOrgs: { org_id: string; org_name: string }[];
  capabilities: StaffCapabilityId[];
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
    await requireCapability(supabase, "equipe");
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

  const consultantIds = rows
    .filter((r) => r.role === "consultant")
    .map((r) => r.user_id);
  const capsByUser = new Map<string, StaffCapabilityId[]>();
  if (consultantIds.length > 0) {
    const admin = await createAdminClient();
    const { data: capRows } = await admin
      .from("consultant_capabilities")
      .select("consultant_id, capability")
      .in("consultant_id", consultantIds);
    for (const row of (capRows ?? []) as {
      consultant_id: string;
      capability: string;
    }[]) {
      if (!isStaffCapabilityId(row.capability)) continue;
      const list = capsByUser.get(row.consultant_id) ?? [];
      list.push(row.capability);
      capsByUser.set(row.consultant_id, list);
    }
  }

  return {
    success: true,
    data: rows.map((r) => ({
      userId: r.user_id,
      email: r.email,
      fullName: r.full_name,
      role: r.role,
      assignedOrgs: r.assigned_orgs,
      capabilities:
        r.role === "platform_admin"
          ? [...STAFF_CAPABILITY_IDS]
          : (capsByUser.get(r.user_id) ?? []),
    })),
  };
}

function actionError(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

export type AddTeamMemberResult = Result<{ userId: string; message: string }>;

/**
 * Adiciona alguém à equipe Land Grow e sempre dispara email de acesso
 * (convite novo ou recuperação se a conta já existe).
 */
export async function addPlatformTeamMember(
  raw: unknown,
): Promise<AddTeamMemberResult> {
  try {
    const supabase = await createClient();
    await requireCapability(supabase, "equipe");

    const parsed = addTeamMemberSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Dados inválidos",
      };
    }

    const { name, role } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();
    const admin = await createAdminClient();

    const { data: existingId } = await supabase.rpc("find_user_id_by_email", {
      p_email: email,
    });

    if (existingId) {
      const { data: alreadyOnTeam } = await admin
        .from("platform_roles")
        .select("user_id")
        .eq("user_id", existingId as string)
        .maybeSingle();
      if (alreadyOnTeam) {
        return {
          success: false,
          error:
            "Este email já está na equipe. Use Reenviar convite se a pessoa não recebeu o email.",
        };
      }
    }

    const mailed = await sendAccessEmail(admin, email, name);
    if (!mailed.ok) {
      return { success: false, error: mailed.error };
    }

    const { error } = await admin
      .from("platform_roles")
      .upsert({ user_id: mailed.userId, role }, { onConflict: "user_id" });

    if (error) return { success: false, error: error.message };

    if (role === "consultant") {
      await admin.from("consultant_capabilities").upsert(
        DEFAULT_CONSULTANT_CAPABILITIES.map((capability) => ({
          consultant_id: mailed.userId,
          capability,
        })),
        { onConflict: "consultant_id,capability", ignoreDuplicates: true },
      );
    }

    return {
      success: true,
      data: {
        userId: mailed.userId,
        message: accessEmailToast(mailed.channel, email),
      },
    };
  } catch (e) {
    console.error("[addPlatformTeamMember]", e);
    return {
      success: false,
      error: actionError(e, "Erro ao adicionar à equipe."),
    };
  }
}

export async function resendPlatformInvite(
  email: string,
  name: string,
): Promise<Result<{ message: string }>> {
  try {
    const supabase = await createClient();
    await requireCapability(supabase, "equipe");
    const admin = await createAdminClient();
    const mailed = await sendAccessEmail(
      admin,
      email.trim().toLowerCase(),
      name,
    );
    if (!mailed.ok) return { success: false, error: mailed.error };
    return {
      success: true,
      data: { message: accessEmailToast(mailed.channel, email) },
    };
  } catch (e) {
    console.error("[resendPlatformInvite]", e);
    return {
      success: false,
      error: actionError(e, "Erro ao reenviar convite."),
    };
  }
}

/** Remove alguém da equipe (perde acesso administrativo, mas não a conta em si). */
export async function removePlatformTeamMember(
  userId: string,
): Promise<Result<{ removed: true }>> {
  try {
    const supabase = await createClient();
    await requireCapability(supabase, "equipe");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id === userId) {
      return {
        success: false,
        error: "Não é possível remover a própria conta da equipe.",
      };
    }

    const admin = await createAdminClient();
    const { data: target } = await admin
      .from("platform_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!target) {
      return { success: false, error: "Essa pessoa já não está na equipe." };
    }

    if (target.role === "platform_admin") {
      const { count } = await admin
        .from("platform_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "platform_admin");
      if ((count ?? 0) <= 1) {
        return {
          success: false,
          error: "Não é possível remover o último admin.",
        };
      }
    }

    const { error } = await admin
      .from("platform_roles")
      .delete()
      .eq("user_id", userId);
    if (error) return { success: false, error: error.message };
    return { success: true, data: { removed: true } };
  } catch (e) {
    console.error("[removePlatformTeamMember]", e);
    return { success: false, error: actionError(e, "Erro ao remover.") };
  }
}

/** Atribui um cliente a um consultor (o que ele passa a enxergar). */
export async function assignConsultantOrg(
  consultantId: string,
  orgId: string,
): Promise<Result<{ assigned: true }>> {
  try {
    const supabase = await createClient();
    await requireCapability(supabase, "equipe");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const admin = await createAdminClient();

    const { error } = await admin.from("consultant_assignments").insert({
      consultant_id: consultantId,
      org_id: orgId,
      assigned_by: user?.id ?? null,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data: { assigned: true } };
  } catch (e) {
    console.error("[assignConsultantOrg]", e);
    return {
      success: false,
      error: actionError(e, "Erro ao atribuir cliente."),
    };
  }
}

/** Remove um cliente da lista de um consultor. */
export async function unassignConsultantOrg(
  consultantId: string,
  orgId: string,
): Promise<Result<{ unassigned: true }>> {
  try {
    const supabase = await createClient();
    await requireCapability(supabase, "equipe");
    const admin = await createAdminClient();

    const { error } = await admin
      .from("consultant_assignments")
      .delete()
      .eq("consultant_id", consultantId)
      .eq("org_id", orgId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: { unassigned: true } };
  } catch (e) {
    console.error("[unassignConsultantOrg]", e);
    return {
      success: false,
      error: actionError(e, "Erro ao desatribuir cliente."),
    };
  }
}

export async function setConsultantCapability(
  consultantId: string,
  capability: string,
  enabled: boolean,
): Promise<Result<{ saved: true }>> {
  try {
    const supabase = await createClient();
    await requireCapability(supabase, "equipe");
    if (!isStaffCapabilityId(capability)) {
      return { success: false, error: "Função inválida." };
    }

    const admin = await createAdminClient();
    const { data: target } = await admin
      .from("platform_roles")
      .select("role")
      .eq("user_id", consultantId)
      .maybeSingle();
    if (target?.role !== "consultant") {
      return {
        success: false,
        error: "Só dá para marcar funções em consultores.",
      };
    }

    if (enabled) {
      const { error } = await admin
        .from("consultant_capabilities")
        .upsert(
          { consultant_id: consultantId, capability },
          { onConflict: "consultant_id,capability" },
        );
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await admin
        .from("consultant_capabilities")
        .delete()
        .eq("consultant_id", consultantId)
        .eq("capability", capability);
      if (error) return { success: false, error: error.message };
    }

    return { success: true, data: { saved: true } };
  } catch (e) {
    console.error("[setConsultantCapability]", e);
    return {
      success: false,
      error: actionError(e, "Erro ao salvar função."),
    };
  }
}
