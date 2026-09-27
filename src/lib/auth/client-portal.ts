import type { SupabaseClient } from "@supabase/supabase-js";

export const ACTIVE_ORG_COOKIE = "pulso-active-org";

type OrgEmbed = {
  slug: string;
  is_internal: boolean | null;
  deleted_at: string | null;
};

export type MembershipOrgRow = {
  org_id: string;
  organizations: OrgEmbed | OrgEmbed[] | null;
};

function clientOrg(row: MembershipOrgRow): { id: string; slug: string } | null {
  const embedded = Array.isArray(row.organizations)
    ? row.organizations[0]
    : row.organizations;
  if (!embedded || embedded.is_internal || embedded.deleted_at) return null;
  return { id: row.org_id, slug: embedded.slug };
}

/** Cliente entra em /{slug}. Equipe da Land Grow continua no /dashboard. */
export function portalPathFromRows(
  rows: MembershipOrgRow[],
  activeOrgId: string | null,
): string {
  const orgs = rows
    .map(clientOrg)
    .filter((org): org is { id: string; slug: string } => org !== null);
  if (orgs.length === 0) return "/dashboard";
  const preferred = orgs.find((org) => org.id === activeOrgId) ?? orgs[0];
  if (!preferred) return "/dashboard";
  return `/${preferred.slug}`;
}

export async function resolveHomePath(
  supabase: SupabaseClient,
  userId: string,
  activeOrgId: string | null,
): Promise<string> {
  const { data: role } = await supabase
    .from("platform_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (role?.role) return "/dashboard";

  const { data: rows } = await supabase
    .from("memberships")
    .select("org_id, organizations(slug, is_internal, deleted_at)")
    .eq("user_id", userId);

  return portalPathFromRows((rows ?? []) as MembershipOrgRow[], activeOrgId);
}
