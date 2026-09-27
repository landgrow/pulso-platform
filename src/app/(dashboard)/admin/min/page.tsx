import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { listRecentMinBlocks } from "@/app/actions/min";
import { MinResults } from "@/components/admin/min-results";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminMinPage(): Promise<JSX.Element> {
  const supabase = await createClient();

  try {
    await requireCapability(supabase, "min");
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

  const blocks = await listRecentMinBlocks();

  return (
    <div className="space-y-6">
      <PageHeader
        title="MIN"
        description="Cada bloco que o cliente conclui chega aqui, com as respostas."
        actions={
          <Badge variant="outline" className="text-text-2">
            admin only
          </Badge>
        }
      />
      <MinResults
        title={null}
        lead={null}
        items={blocks.success ? blocks.data : []}
        empty={
          blocks.success
            ? "Nenhum bloco ainda. Quando o cliente concluir um bloco do MIN, as respostas aparecem aqui."
            : `Não deu para ler os blocos: ${blocks.error}`
        }
      />
    </div>
  );
}
