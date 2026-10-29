import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireAnyCapability } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { listClientDirectory } from "@/app/actions/clientes";
import { PulsoChat } from "@/components/inteligencia/pulso-chat";
import { resolveLlm } from "@/lib/inteligencia/llm";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminCentralIaPage(): Promise<JSX.Element> {
  const supabase = await createClient();

  try {
    await requireAnyCapability(supabase, ["painel", "bin", "clientes"]);
  } catch (e) {
    return (
      <AccessDenied
        message={e instanceof Error ? e.message : "Apenas a equipe Land Grow."}
      />
    );
  }

  const [directory, llm] = await Promise.all([
    listClientDirectory(),
    Promise.resolve(resolveLlm()),
  ]);
  const orgs = directory.success
    ? directory.data
        .filter((row) => !row.deleted_at)
        .map((row) => ({ id: row.org_id, name: row.name }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PageHeader
          title="Central IA"
          description="Pergunte com o dossiê da empresa: BIN vivo, reuniões, tarefas e objetivos. Não inventa o que o PULSO não tem."
        />
        <Badge variant="outline" className="text-text-2">
          equipe
        </Badge>
      </div>
      <PulsoChat
        surface="admin"
        orgs={orgs}
        {...("error" in llm
          ? { llmError: llm.error }
          : { llmLabel: llm.label })}
      />
    </div>
  );
}
