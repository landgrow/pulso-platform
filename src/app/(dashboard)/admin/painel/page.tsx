import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { listRecentBinEvents } from "@/app/actions/bin";
import { listRecentMinBlocks } from "@/app/actions/min";
import { listClientDirectory } from "@/app/actions/clientes";
import { BinInbox } from "@/components/bin/bin-inbox";
import { MinResults } from "@/components/admin/min-results";
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

  const [result, binEvents, minBlocks] = await Promise.all([
    listClientDirectory(),
    listRecentBinEvents(),
    listRecentMinBlocks(),
  ]);
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
        description="Prazos da carteira e o que o cliente enviou no BIN e no MIN. O diagnóstico sai da ficha de cada empresa."
      />

      <BinInbox
        items={binEvents.success ? binEvents.data : []}
        empty={
          binEvents.success
            ? "Nenhum envio ainda. Quando o cliente mandar o diagnóstico geral ou um setor, aparece aqui e no e-mail da equipe."
            : `Não deu para ler os envios: ${binEvents.error}`
        }
      />

      <MinResults
        items={minBlocks.success ? minBlocks.data : []}
        empty={
          minBlocks.success
            ? "Nenhum bloco do MIN ainda. Quando o cliente concluir um bloco, as respostas aparecem aqui."
            : `Não deu para ler o MIN: ${minBlocks.error}`
        }
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
