"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { inviteRedirectTo } from "@/lib/auth/invite-callback";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const additionalMemberSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(["client_member", "client_viewer"]),
});

const createClientAccountSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  organizationName: z
    .string()
    .min(2, "Nome da empresa deve ter no mínimo 2 caracteres"),
  additionalMembers: z.array(additionalMemberSchema).default([]),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Confirma que o usuário logado é platform_admin. Lança erro se não for.
 * Consulta a tabela platform_roles (mesma fonte de is_platform_admin() usada
 * nas policies de RLS) — profiles.is_platform_admin não existe no banco.
 */
async function assertCanManageAcessos(): Promise<void> {
  const supabase = await createClient();
  await requireCapability(supabase, "acessos");
}

// ─── Server Actions ─────────────────────────────────────────────────────────

export type IsPlatformAdminResult = { isAdmin: boolean };

/** Usado pela página para decidir entre mostrar o formulário ou "acesso negado". */
export async function getIsPlatformAdmin(): Promise<IsPlatformAdminResult> {
  try {
    await assertCanManageAcessos();
    return { isAdmin: true };
  } catch {
    return { isAdmin: false };
  }
}

export type CreateClientAccountResult =
  | {
      success: true;
      userId: string;
      orgId: string;
      slug: string;
      email: string;
      warnings: string[];
    }
  | { success: false; error: string };

/**
 * Cria um acesso de cliente inteiro (usuário + organização + membership
 * client_owner) direto pelo admin, sem passar por cadastro público.
 *
 * O usuário recebe um convite por email do próprio Supabase, com um link pra
 * definir a própria senha (via /auth/callback -> /reset-password) — a Land
 * Grow nunca vê nem gera senha nenhuma.
 */
export async function createClientAccount(
  raw: unknown,
): Promise<CreateClientAccountResult> {
  try {
    await assertCanManageAcessos();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Acesso negado",
    };
  }

  const parsed = createClientAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  const { name, email, organizationName, additionalMembers } = parsed.data;
  const admin = await createAdminClient();

  const { data: created, error: createError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
      redirectTo: inviteRedirectTo(process.env.NEXT_PUBLIC_APP_URL),
    });

  if (createError || !created.user) {
    const msg = createError?.message?.toLowerCase() ?? "";
    if (
      msg.includes("already been registered") ||
      msg.includes("already registered")
    ) {
      return { success: false, error: "Este email já está cadastrado" };
    }
    return {
      success: false,
      error: createError?.message ?? "Erro ao criar usuário",
    };
  }

  const userId = created.user.id;

  try {
    const baseSlug = generateSlug(organizationName);
    const { data: existing } = await admin
      .from("organizations")
      .select("slug")
      .like("slug", `${baseSlug}%`);
    const existingSlugs = (existing ?? []).map((o: { slug: string }) => o.slug);
    const slug = ensureUniqueSlug(baseSlug, existingSlugs);

    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ slug, name: organizationName, plan: "trial" })
      .select("id")
      .single();

    if (orgError || !org) {
      throw new Error(orgError?.message ?? "Falha ao criar organização");
    }

    const { error: memberError } = await admin.from("memberships").insert({
      user_id: userId,
      org_id: org.id,
      role: "client_owner",
    });

    if (memberError) {
      await admin.from("organizations").delete().eq("id", org.id);
      throw new Error(memberError.message);
    }

    // Cria o registro em `clientes` (1:1 com organizations) — sem ele, o
    // cliente não consegue usar o Motor de Coleções (periods.ts busca a org
    // via clientes.org_id e falha com "Cliente não encontrado" se não existir).
    const { error: clienteError } = await admin.from("clientes").insert({
      org_id: org.id,
      nome: organizationName,
    });

    if (clienteError) {
      await admin.from("memberships").delete().eq("org_id", org.id);
      await admin.from("organizations").delete().eq("id", org.id);
      throw new Error(clienteError.message);
    }

    // Membros adicionais (client_member/client_viewer) — melhor esforço:
    // se um convite falhar (ex: email já cadastrado), reporta como aviso em
    // vez de desfazer a organização inteira, que já foi criada com sucesso.
    const warnings: string[] = [];
    for (const member of additionalMembers) {
      const { data: memberCreated, error: memberInviteError } =
        await admin.auth.admin.inviteUserByEmail(member.email, {
          data: { full_name: member.name },
          redirectTo: inviteRedirectTo(process.env.NEXT_PUBLIC_APP_URL),
        });

      if (memberInviteError || !memberCreated.user) {
        warnings.push(
          `${member.email}: ${memberInviteError?.message ?? "erro ao convidar"}`,
        );
        continue;
      }

      const { error: extraMemberError } = await admin
        .from("memberships")
        .insert({
          user_id: memberCreated.user.id,
          org_id: org.id,
          role: member.role,
        });

      if (extraMemberError) {
        warnings.push(`${member.email}: ${extraMemberError.message}`);
        await admin.auth.admin.deleteUser(memberCreated.user.id);
      }
    }

    return { success: true, userId, orgId: org.id, slug, email, warnings };
  } catch (e) {
    // Rollback: sem org/membership, o usuário órfão não deve ficar no auth.
    await admin.auth.admin.deleteUser(userId);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro ao criar organização",
    };
  }
}
