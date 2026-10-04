import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPlatformRole,
  type PlatformRole,
} from "@/lib/supabase/platform-role-server";

export interface OrgAccess {
  user: User;
  orgId: string;
  platformRole: PlatformRole | null;
  memberRole: string | null;
  canWrite: boolean;
}

export type OrgAccessResult =
  { ok: true; access: OrgAccess } | { ok: false; error: string };

/**
 * Checagem única de acesso a uma org, pra toda action que depois usa o client
 * admin. `can_access_org` já respeita atribuição de consultor e membership;
 * `write` barra client_viewer (a RLS de escrita não diferencia viewer).
 */
// Uma página chama authorizeOrg várias vezes pra mesma org (página + actions
// de leitura): cacheado por requisição, e as 3 consultas rodam em paralelo.
const accessForOrg = cache(async (orgId: string): Promise<OrgAccessResult> => {
  const user = await getRequestUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const supabase = await createClient();
  const admin = await createAdminClient();
  const [{ data: canAccess, error }, platformRole, { data: membership }] =
    await Promise.all([
      supabase.rpc("can_access_org", { org_id: orgId }),
      getPlatformRole(),
      admin
        .from("memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("org_id", orgId)
        .maybeSingle(),
    ]);
  if (error || !canAccess) {
    return { ok: false, error: "Sem acesso a esta organização" };
  }

  const memberRole = (membership?.role as string | undefined) ?? null;
  const canWrite =
    platformRole !== null ||
    (memberRole !== null && memberRole !== "client_viewer");
  return {
    ok: true,
    access: { user, orgId, platformRole, memberRole, canWrite },
  };
});

export async function authorizeOrg(
  orgId: string,
  opts: { write?: boolean } = {},
): Promise<OrgAccessResult> {
  const result = await accessForOrg(orgId);
  if (result.ok && opts.write && !result.access.canWrite) {
    return { ok: false, error: "Seu acesso é somente leitura" };
  }
  return result;
}

export interface ClientOrg {
  id: string;
  slug: string;
  name: string;
}

/**
 * Org de cliente pelo slug da URL + autorização — sem depender do cookie de
 * org ativa (que fazia /clientes/{slug}/* dar 404 pra quem tinha outra org
 * ativa, ex.: equipe no HQ ou quem usou o seletor de org).
 */
export async function authorizeClientSlug(
  slug: string,
  opts: { write?: boolean } = {},
): Promise<
  { ok: true; org: ClientOrg; access: OrgAccess } | { ok: false; error: string }
> {
  const admin = await createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, slug, name, is_internal, deleted_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!org || org.deleted_at || org.is_internal) {
    return { ok: false, error: "Organização não encontrada" };
  }
  const result = await authorizeOrg(org.id as string, opts);
  if (!result.ok) return result;
  return {
    ok: true,
    org: {
      id: org.id as string,
      slug: org.slug as string,
      name: org.name as string,
    },
    access: result.access,
  };
}

/** Resolve a org dona do card (via admin) e autoriza o usuário nela. */
export async function authorizeCard(
  cardId: string,
  opts: { write?: boolean } = {},
): Promise<OrgAccessResult> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("board_cards")
    .select("boards!inner(org_id)")
    .eq("id", cardId)
    .maybeSingle();
  const boards = (
    data as { boards?: { org_id: string } | { org_id: string }[] } | null
  )?.boards;
  const orgId = Array.isArray(boards) ? boards[0]?.org_id : boards?.org_id;
  if (!orgId) return { ok: false, error: "Card não encontrado" };
  return authorizeOrg(orgId, opts);
}

/** Resolve a org dona do período (via admin) e autoriza o usuário nela. */
export async function authorizePeriodo(
  periodoId: string,
  opts: { write?: boolean } = {},
): Promise<OrgAccessResult & { periodoStatus?: string }> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("periodos_dados")
    .select("status, clientes!inner(org_id)")
    .eq("id", periodoId)
    .maybeSingle();
  const row = data as {
    status: string;
    clientes: { org_id: string } | { org_id: string }[];
  } | null;
  const cliente = row
    ? Array.isArray(row.clientes)
      ? row.clientes[0]
      : row.clientes
    : null;
  if (!row || !cliente?.org_id) {
    return { ok: false, error: "Período não encontrado" };
  }
  const result = await authorizeOrg(cliente.org_id, opts);
  return { ...result, periodoStatus: row.status };
}
