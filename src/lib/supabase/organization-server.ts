/**
 * Helpers server-side para Organizações (multi-tenant).
 *
 * ⚠️  Este arquivo importa `next/headers` (cookies) e é SERVER-ONLY.
 *    NUNCA importe de Client Components.
 *    Para funções puras, importe de `@/lib/supabase/organization`.
 */

import "server-only";
import { cache } from "react";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  ActiveOrganizationContext,
  AccessibleOrganization,
} from "@/types/organization";
import { accessibleToOrganization } from "@/lib/supabase/organization";

const ACTIVE_ORG_COOKIE = "pulso-active-org";
const ACTIVE_ORG_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

// ─── Active organization ─────────────────────────────────────────────────────

/**
 * Retorna a organização ativa (do cookie) ou a primeira disponível.
 * Retorna `null` se o usuário não tem nenhuma organização.
 */
// Orgs acessíveis + id da org interna, uma vez por requisição (layout, sidebar
// e página pedem isso ao mesmo tempo).
const loadOrgContext = cache(
  async (): Promise<{
    orgsList: AccessibleOrganization[];
    internalId: string | null;
  } | null> => {
    const user = await getRequestUser();
    if (!user) return null;
    const supabase = await createClient();
    const [{ data: orgs, error }, { data: internal }] = await Promise.all([
      supabase.rpc("my_accessible_orgs"),
      supabase
        .from("organizations")
        .select("id")
        .eq("is_internal", true)
        .maybeSingle(),
    ]);
    if (error || !orgs || orgs.length === 0) return null;
    return {
      orgsList: orgs as AccessibleOrganization[],
      internalId: (internal?.id as string | undefined) ?? null,
    };
  },
);

export const getActiveOrganization = cache(
  async (): Promise<ActiveOrganizationContext | null> => {
    const ctx = await loadOrgContext();
    if (!ctx) return null;
    const { orgsList, internalId } = ctx;

    const cookieStore = await cookies();
    const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

    // Se tem cookie E a org ainda é acessível, usa ela
    if (activeOrgId) {
      const found = orgsList.find((o) => o.id === activeOrgId);
      if (found) {
        return {
          org: accessibleToOrganization(found),
          role: found.my_role,
        };
      }
    }

    // Fallback: na equipe, a org interna da Land Grow — não o primeiro cliente
    // da lista (isso escondia o HQ depois de “Entrar como membro”).
    const preferred =
      (internalId
        ? orgsList.find((org) => org.id === internalId)
        : undefined) ?? orgsList[0];
    if (!preferred) return null;
    return {
      org: accessibleToOrganization(preferred),
      role: preferred.my_role,
    };
  },
);

/**
 * Igual a `getActiveOrganization`, mas redireciona para `/configuracoes/organizacoes`
 * se não houver org ativa. Use em páginas que exigem org.
 */
export async function requireOrganization(): Promise<ActiveOrganizationContext> {
  const ctx = await getActiveOrganization();
  if (!ctx) {
    redirect("/configuracoes/organizacoes?reason=no_org");
  }
  return ctx;
}

/**
 * Org interna da Land Grow (HQ). Cliente — e staff em “Entrar como membro” —
 * está numa org com is_internal = false.
 */
export async function isActiveOrgInternal(): Promise<boolean> {
  const [active, ctx] = await Promise.all([
    getActiveOrganization(),
    loadOrgContext(),
  ]);
  if (!active || !ctx) return true;
  return active.org.id === ctx.internalId;
}

/**
 * Atualiza o cookie de org ativa.
 * Chamado pelo org switcher.
 */
export async function setActiveOrganizationCookie(
  orgId: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACTIVE_ORG_MAX_AGE,
    path: "/",
  });
}

/**
 * Lista todas as organizações acessíveis ao usuário atual.
 * Server-side — use em Server Components.
 */
export async function getAccessibleOrganizations(): Promise<
  AccessibleOrganization[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_accessible_orgs");
  if (error || !data) return [];
  return data as AccessibleOrganization[];
}
