import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { listClientDirectory } from "@/app/actions/clientes";
import { PageHeader } from "@/components/ui/page-header";
import { PainelLive } from "@/components/ops/painel-live";

export default async function AdminPainelPage(): Promise<JSX.Element> {
  const supabase = await createClient();

  try {
    await requireCapability(supabase, "painel");
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

  const result = await listClientDirectory();
  if (!result.success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
            <h1 className="text-xl font-semibold mb-2">
              Não foi possível listar
            </h1>
            <p className="text-text-2 text-sm">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ativos = result.data.filter((c) => !c.deleted_at);
  const encerrados = result.data.filter((c) => c.deleted_at);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel"
        description="Prazos da carteira, ao vivo. Atividades da Land Grow ficam no Dashboard. BIN e MIN na ficha de cada cliente."
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <p className="text-xs uppercase tracking-wide text-text-2">Ativos</p>
          <p className="text-2xl font-semibold tabular-nums mt-1">
            {ativos.length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <p className="text-xs uppercase tracking-wide text-text-2">
            Encerrados
          </p>
          <p className="text-2xl font-semibold tabular-nums mt-1">
            {encerrados.length}
          </p>
        </div>
      </div>

      <PainelLive ativos={ativos} />
    </div>
  );
}
