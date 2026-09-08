/**
 * Helpers puros de Organizações (multi-tenant).
 *
 * Este arquivo contém APENAS funções sem dependência de cookies ou server-only.
 * Pode ser importado por Client e Server Components.
 *
 * Funções server-side (que usam cookies) estão em:
 *   - src/app/actions/organization.ts
 */

import type {
  AccessibleOrganization,
  MembershipRole,
  Organization,
  OrganizationPlan,
} from "@/types/organization";

// ─── Role label ───────────────────────────────────────────────────────────────

export function getRoleLabel(role: MembershipRole): string {
  switch (role) {
    case "client_owner":
      return "Proprietário";
    case "client_member":
      return "Membro";
    case "client_viewer":
      return "Visualizador";
    case "platform_admin":
      return "Admin (Land Grow)";
    case "consultant":
      return "Consultor (Land Grow)";
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Converte AccessibleOrganization (do RPC) para Organization.
 * Função pura — sem side effects.
 */
export function accessibleToOrganization(
  accessible: AccessibleOrganization,
): Organization {
  return {
    id: accessible.id,
    slug: accessible.slug,
    name: accessible.name,
    plan: accessible.plan as OrganizationPlan,
    created_at: "",
    updated_at: "",
    deleted_at: null,
  };
}
