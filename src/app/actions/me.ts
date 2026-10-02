"use server";

import { createClient } from "@/lib/supabase/server";
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
export async function getMyPlatformRole(): Promise<{
  role: PlatformRole | null;
  capabilities: StaffCapabilityId[];
  inClientWorkspace: boolean;
  clientSlug: string | null;
}> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  const capabilities = await getStaffCapabilities(supabase);
  const internal = await isActiveOrgInternal();
  const inClientWorkspace = role === null || !internal;
  let clientSlug: string | null = null;
  if (!internal) {
    const active = await getActiveOrganization();
    clientSlug = active?.org.slug ?? null;
  }
  return { role, capabilities, inClientWorkspace, clientSlug };
}
