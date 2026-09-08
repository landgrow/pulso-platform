/**
 * Tipos do domínio de Organizações (multi-tenant).
 */

export type OrganizationPlan = "trial" | "starter" | "pro" | "enterprise";

export type ClientRole = "client_owner" | "client_member" | "client_viewer";
export type PlatformRole = "platform_admin" | "consultant";
export type MembershipRole = ClientRole | PlatformRole;

export interface Organization {
  id: string;
  slug: string;
  name: string;
  plan: OrganizationPlan;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Membership {
  id: string;
  user_id: string;
  org_id: string;
  role: ClientRole;
  created_at: string;
  updated_at: string;
}

/**
 * Resposta da função SQL `my_accessible_orgs()`.
 * Lista orgs com o papel do usuário em cada uma.
 */
export interface AccessibleOrganization {
  id: string;
  slug: string;
  name: string;
  plan: OrganizationPlan;
  my_role: MembershipRole;
}

/**
 * Contexto ativo de uma organização no app.
 */
export interface ActiveOrganizationContext {
  org: Organization;
  role: MembershipRole;
}
