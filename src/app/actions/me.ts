"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getPlatformRole,
  type PlatformRole,
} from "@/lib/supabase/platform-role-server";

/**
 * Papel de plataforma do usuário logado, sem exigir nenhum papel específico
 * (diferente de requirePlatformAdmin) — qualquer usuário pode checar o
 * próprio papel. Usado pela sidebar pra decidir o que mostrar.
 */
export async function getMyPlatformRole(): Promise<{
  role: PlatformRole | null;
}> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  return { role };
}
