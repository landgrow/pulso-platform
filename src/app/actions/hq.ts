"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlatformRole } from "@/lib/supabase/platform-role-server";
import {
  isActiveOrgInternal,
  setActiveOrganizationCookie,
} from "@/lib/supabase/organization-server";

/**
 * Volta a sessão para a org interna da Land Grow (HQ).
 * Usado depois de “Entrar como membro” e pelo botão Administração.
 */
export async function returnToLandGrowHq(
  redirectTo = "/dashboard",
): Promise<{ restored: boolean }> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  if (!role) return { restored: false };
  if (await isActiveOrgInternal()) return { restored: false };

  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("is_internal", true)
    .maybeSingle();
  if (!data?.id) return { restored: false };

  await setActiveOrganizationCookie(data.id);
  redirect(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}
