import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { MetricasPageContent } from "@/components/admin/metricas-page-content";

export default async function AdminMetricasPage(): Promise<JSX.Element> {
  const supabase = await createClient();

  try {
    await requireCapability(supabase, "metricas");
  } catch (e) {
    return (
      <AccessDenied
        message={
          e instanceof Error
            ? e.message
            : "Apenas administradores da plataforma."
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Métricas</h1>
          <Badge variant="outline" className="text-text-2">
            admin only
          </Badge>
        </div>
        <p className="text-text-2">
          Indicadores gerais do negócio — funil de CRM e financeiro (contratos
          ativos).
        </p>
      </div>
      <MetricasPageContent />
    </div>
  );
}
