"use server";

import {
  getPlatformRole,
  getStaffCapabilities,
  type PlatformRole,
} from "@/lib/supabase/platform-role-server";
import {
  getActiveOrganization,
  isActiveOrgInternal,
} from "@/lib/supabase/organization-server";
import type { StaffCapabilityId } from "@/lib/auth/staff-access";

/**
 * Papel de plataforma do usuário logado, sem exigir nenhum papel específico
 * (diferente de requirePlatformAdmin) — qualquer usuário pode checar o
 * próprio papel. Usado pela sidebar pra decidir o que mostrar.
 * `clientSlug` é a empresa do cliente ativa (null quando está no HQ).
 */
export interface MeInfo {
  role: PlatformRole | null;
  capabilities: StaffCapabilityId[];
  inClientWorkspace: boolean;
  clientSlug: string | null;
}

export async function getMyPlatformRole(): Promise<MeInfo> {
  const [role, capabilities, internal, active] = await Promise.all([
    getPlatformRole(),
    getStaffCapabilities(),
    isActiveOrgInternal(),
    getActiveOrganization(),
  ]);
  return {
    role,
    capabilities,
    inClientWorkspace: role === null || !internal,
    clientSlug: internal ? null : (active?.org.slug ?? null),
  };
}
