/**
 * Helpers server-side para Organizações (multi-tenant).
 *
 * ⚠️  Este arquivo importa `next/headers` (cookies) e é SERVER-ONLY.
 *    NUNCA importe de Client Components.
 *    Para funções puras, importe de `@/lib/supabase/organization`.
 */

import "server-only";
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
export async function getActiveOrganization(): Promise<ActiveOrganizationContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  // Lista orgs acessíveis via função SQL
  const { data: orgs, error } = await supabase.rpc("my_accessible_orgs");
  if (error || !orgs || orgs.length === 0) return null;

  const orgsList = orgs as AccessibleOrganization[];

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

  // Fallback: primeira org (alfabética)
  const first = orgsList[0];
  if (!first) return null;
  return {
    org: accessibleToOrganization(first),
    role: first.my_role,
  };
}

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
