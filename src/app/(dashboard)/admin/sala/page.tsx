import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { SalaWorkspace } from "@/components/sala/sala-workspace";

export default async function AdminSalaPage(): Promise<JSX.Element> {
  const supabase = await createClient();

  try {
    await requireCapability(supabase, "sala");
  } catch (e) {
    return (
      <AccessDenied
        message={
          e instanceof Error
            ? e.message
            : "Apenas a equipe Land Grow com acesso à Sala."
        }
      />
    );
  }

  return <SalaWorkspace />;
}
