import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { FinanceiroWorkspace } from "@/components/financeiro/financeiro-workspace";

export default async function AdminFinanceiroPage(): Promise<JSX.Element> {
  const supabase = await createClient();

  try {
    await requireCapability(supabase, "financeiro");
  } catch (e) {
    return (
      <AccessDenied
        message={
          e instanceof Error
            ? e.message
            : "Apenas equipe com acesso ao Financeiro."
        }
      />
    );
  }

  return <FinanceiroWorkspace />;
}
