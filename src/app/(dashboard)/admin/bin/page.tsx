import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireAnyCapability } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { listRecentBinEvents } from "@/app/actions/bin";
import { BinInbox } from "@/components/bin/bin-inbox";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminBinPage(): Promise<JSX.Element> {
  const supabase = await createClient();

  try {
    await requireAnyCapability(supabase, ["bin", "clientes", "painel"]);
  } catch (e) {
    return (
      <AccessDenied
        message={
          e instanceof Error
            ? e.message
            : "Apenas a equipe Land Grow vê os envios do BIN."
        }
      />
    );
  }

  const events = await listRecentBinEvents();
  if (!events.success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
            <h1 className="text-xl font-semibold mb-2">
              Não foi possível listar os envios
            </h1>
            <p className="text-text-2 text-sm">{events.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="BIN"
        description="Inbox do que o cliente enviou. Abra a ficha para ler as respostas e fazer o diagnóstico. Quem preenche é o cliente, no PULSO dele."
      />
      <BinInbox items={events.data} />
    </div>
  );
}
