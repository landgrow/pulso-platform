"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformRole } from "@/lib/supabase/platform-role-server";
import { inviteRedirectTo } from "@/lib/auth/invite-callback";
import { setActiveOrganizationCookie } from "@/lib/supabase/organization-server";
import type { ClientDirectoryEntry, Programa } from "@/types/clientes";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createContratoSchema = z.object({
  clienteId: z.string().uuid("Cliente inválido"),
  programa: z.enum(["bin", "scale", "conselho", "foco"]),
  valor: z.number().min(0, "Valor não pode ser negativo"),
  moeda: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
  dataInicio: z.string().min(1, "Data de início é obrigatória"),
  dataFim: z.string().optional(),
  observacoes: z.string().optional(),
});

const encerrarContratoSchema = z.object({
  contratoId: z.string().uuid("Contrato inválido"),
});

const addTeamMemberSchema = z.object({
  orgId: z.string().uuid("Organização inválida"),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(["client_member", "client_viewer"]),
});

const removeTeamMemberSchema = z.object({
  orgId: z.string().uuid("Organização inválida"),
  userId: z.string().uuid("Usuário inválido"),
});

const orgIdSchema = z.object({
  orgId: z.string().uuid("Organização inválida"),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function requireAdminOrConsultant(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  if (!role) {
    return {
      ok: false,
      error: "Acesso negado. Apenas administradores da plataforma.",
    };
  }
  return { ok: true };
}

// ─── Server Actions ─────────────────────────────────────────────────────────

/** Lista todos os clientes acessíveis (todos p/ platform_admin, atribuídos p/ consultant). */
export async function listClientDirectory(): Promise<
  Result<ClientDirectoryEntry[]>
> {
  const gate = await requireAdminOrConsultant();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_client_directory");

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as ClientDirectoryEntry[] };
}

/** Detalhe de um único cliente pelo org_id — mesma fonte da listagem. */
export async function getClienteDirectoryEntry(
  orgId: string,
): Promise<Result<ClientDirectoryEntry | null>> {
  const gate = await requireAdminOrConsultant();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_client_directory", {
    p_org_id: orgId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const rows = (data ?? []) as ClientDirectoryEntry[];
  return { success: true, data: rows[0] ?? null };
}

export type CreateContratoResult = Result<{ id: string }>;

export async function createContrato(
  raw: unknown,
): Promise<CreateContratoResult> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  if (role !== "platform_admin") {
    return {
      success: false,
      error: "Apenas administradores podem criar contratos.",
    };
  }

  const parsed = createContratoSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  const {
    clienteId,
    programa,
    valor,
    moeda,
    dataInicio,
    dataFim,
    observacoes,
  } = parsed.data;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("contratos")
    .insert({
      cliente_id: clienteId,
      programa: programa satisfies Programa,
      valor,
      moeda,
      data_inicio: dataInicio,
      data_fim: dataFim || null,
      observacoes: observacoes || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    const msg = error?.message ?? "Erro ao criar contrato";
    if (msg.includes("idx_contratos_ativo_unico")) {
      return {
        success: false,
        error: "Já existe um contrato ativo desse programa para este cliente.",
      };
    }
    return { success: false, error: msg };
  }

  const { syncReceivableFromContrato } =
    await import("@/app/actions/financeiro");
  await syncReceivableFromContrato({
    contratoId: data.id,
    clienteId,
    programa,
    valor,
    moeda,
    dataInicio,
  });

  return { success: true, data: { id: data.id } };
}

export async function encerrarContrato(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  if (role !== "platform_admin") {
    return {
      success: false,
      error: "Apenas administradores podem encerrar contratos.",
    };
  }

  const parsed = encerrarContratoSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  const { data, error } = await supabase
    .from("contratos")
    .update({
      status: "encerrado",
      data_fim: new Date().toISOString().slice(0, 10),
    })
    .eq("id", parsed.data.contratoId)
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Erro ao encerrar contrato",
    };
  }

  return { success: true, data: { id: data.id } };
}

/**
 * Adiciona um novo usuário ao time de um cliente já existente — convite igual
 * ao de /admin/acessos (email do próprio Supabase, define a própria senha),
 * só que vinculado como client_member/client_viewer, não dono.
 */
export async function addTeamMember(
  raw: unknown,
): Promise<Result<{ userId: string }>> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  if (role !== "platform_admin") {
    return {
      success: false,
      error: "Apenas administradores podem adicionar acesso.",
    };
  }

  const parsed = addTeamMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  const { orgId, name, email, role: teamRole } = parsed.data;
  const admin = await createAdminClient();

  const { data: created, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
      redirectTo: inviteRedirectTo(process.env.NEXT_PUBLIC_APP_URL),
    });

  if (inviteError || !created.user) {
    const msg = inviteError?.message?.toLowerCase() ?? "";
    if (
      msg.includes("already been registered") ||
      msg.includes("already registered")
    ) {
      return {
        success: false,
        error:
          "Este email já tem conta em outro lugar do sistema — ainda não dá pra vincular uma conta existente por aqui.",
      };
    }
    return {
      success: false,
      error: inviteError?.message ?? "Erro ao convidar usuário",
    };
  }

  const { error: memberError } = await admin.from("memberships").insert({
    user_id: created.user.id,
    org_id: orgId,
    role: teamRole,
  });

  if (memberError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { success: false, error: memberError.message };
  }

  return { success: true, data: { userId: created.user.id } };
}

/** Remove o acesso de um usuário do time — não deixa remover o dono por aqui. */
export async function removeTeamMember(
  raw: unknown,
): Promise<Result<{ removed: true }>> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  if (role !== "platform_admin") {
    return {
      success: false,
      error: "Apenas administradores podem remover acesso.",
    };
  }

  const parsed = removeTeamMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos" };
  }

  const { orgId, userId } = parsed.data;

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membership?.role === "client_owner") {
    return {
      success: false,
      error:
        "Não dá pra remover o dono por aqui — encerre o cliente inteiro se for o caso.",
    };
  }

  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: { removed: true } };
}

/** Encerra um cliente — tira o acesso de todo o time daquela empresa. */
export async function encerrarCliente(
  raw: unknown,
): Promise<Result<{ orgId: string }>> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  if (role !== "platform_admin") {
    return {
      success: false,
      error: "Apenas administradores podem encerrar clientes.",
    };
  }

  const parsed = orgIdSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos" };
  }

  const { error } = await supabase
    .from("organizations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.orgId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: { orgId: parsed.data.orgId } };
}

/** Reativa um cliente encerrado. */
export async function reativarCliente(
  raw: unknown,
): Promise<Result<{ orgId: string }>> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  if (role !== "platform_admin") {
    return {
      success: false,
      error: "Apenas administradores podem reativar clientes.",
    };
  }

  const parsed = orgIdSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos" };
  }

  const { error } = await supabase
    .from("organizations")
    .update({ deleted_at: null })
    .eq("id", parsed.data.orgId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: { orgId: parsed.data.orgId } };
}

/**
 * "Entrar como membro" — troca a organização ativa da sessão do admin pra
 * esse cliente e manda pro dashboard normal, o mesmo espaço que o próprio
 * cliente vê ao logar. Diferente de setActiveOrganization() (que exige uma
 * linha em memberships), aqui não checa vínculo — platform_admin/consultant
 * já enxergam qualquer organização via my_accessible_orgs()/can_access_org(),
 * então só confirma o papel antes de trocar o cookie.
 */
export async function viewClienteAsAdmin(orgId: string): Promise<void> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  if (!role) {
    throw new Error("Acesso negado. Apenas administradores da plataforma.");
  }

  await setActiveOrganizationCookie(orgId);
  redirect("/dashboard");
}
