"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getPlatformRole,
  getStaffCapabilities,
  type PlatformRole,
} from "@/lib/supabase/platform-role-server";
import type { StaffCapabilityId } from "@/lib/auth/staff-access";

/**
 * Papel de plataforma do usuário logado, sem exigir nenhum papel específico
 * (diferente de requirePlatformAdmin) — qualquer usuário pode checar o
 * próprio papel. Usado pela sidebar pra decidir o que mostrar.
 */
export async function getMyPlatformRole(): Promise<{
  role: PlatformRole | null;
  capabilities: StaffCapabilityId[];
}> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  const capabilities = await getStaffCapabilities(supabase);
  return { role, capabilities };
}
