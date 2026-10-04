import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import type { StaffCapabilityId } from "@/lib/auth/staff-access";

/** Id da org interna (HQ da Land Grow), exigindo a capability da equipe. */
export async function requireInternalOrg(
  capability: StaffCapabilityId,
): Promise<{ ok: true; orgId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  try {
    await requireCapability(supabase, capability);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Acesso negado.",
    };
  }
  const admin = await createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("id")
    .eq("is_internal", true)
    .maybeSingle();
  if (!data?.id) {
    return {
      ok: false,
      error: "Organização interna da Land Grow não encontrada.",
    };
  }
  return { ok: true, orgId: data.id as string };
}
