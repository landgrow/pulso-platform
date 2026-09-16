import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { MetricasPageContent } from "@/components/admin/metricas-page-content";
import { MetricasExportButton } from "@/components/admin/metricas-export-button";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader
        title="Métricas"
        description="Indicadores gerais do negócio — funil de CRM e financeiro (contratos ativos)."
        actions={
          <>
            <Badge variant="outline" className="text-text-2">
              admin only
            </Badge>
            <MetricasExportButton />
          </>
        }
      />
      <MetricasPageContent />
    </div>
  );
}
