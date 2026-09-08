/**
 * Resolução de organização para a área /admin/clientes — separado de
 * organization-server.ts de propósito: aquele arquivo resolve a organização
 * ATIVA da sessão (via cookie pulso-active-org), pensado pra um usuário que
 * pertence a uma organização por vez. Este arquivo resolve QUALQUER
 * organização pelo slug, sem depender de cookie nenhum — é o que permite um
 * platform_admin/consultant "espiar" os dados de um cliente sem precisar
 * trocar a própria organização ativa.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import {
  getPlatformRole,
  type PlatformRole,
} from "@/lib/supabase/platform-role-server";
import type { Organization } from "@/types/organization";

export interface AdminOrgContext {
  org: Organization;
  viewerRole: PlatformRole;
}

/**
 * Busca uma organização pelo slug para a área admin. Só platform_admin e
 * consultant chegam aqui — RLS (orgs_select -> can_access_org) garante que um
 * consultant só enxerga organizações às quais foi atribuído.
 */
export async function requireAdminOrgAccess(
  slug: string,
): Promise<AdminOrgContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const viewerRole = await getPlatformRole(supabase);
  if (!viewerRole) redirect("/dashboard");

  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, slug, name, plan, created_at, updated_at, deleted_at")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !org) notFound();

  return { org: org as Organization, viewerRole };
}
