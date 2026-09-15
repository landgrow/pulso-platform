import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStaffCapabilities } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { listBoards } from "@/app/actions/boards";
import { AutomationsPanel } from "@/components/atividades/automations-panel";
import { Button } from "@/components/ui/button";

export default async function OperacaoPage(): Promise<JSX.Element> {
  const supabase = await createClient();
  const caps = await getStaffCapabilities(supabase);
  if (!caps.includes("atividades") && !caps.includes("crm")) {
    return <AccessDenied message="Só a equipe Land Grow configura operação." />;
  }

  const { data: internalOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("is_internal", true)
    .maybeSingle();

  const boards = internalOrg
    ? await Promise.all([
        listBoards(internalOrg.id, "atividades"),
        listBoards(internalOrg.id, "crm"),
      ])
    : [];

  const boardOptions = boards.flatMap((result) =>
    result.success ? result.data.map((b) => ({ id: b.id, name: b.name })) : [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operação</h1>
        <p className="text-text-2">
          Automações dos kanbans internos. Campos e colunas de cada base se
          abrem no próprio board, em Atividades ou CRM.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/atividades">Abrir Atividades</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/crm">Abrir CRM</Link>
        </Button>
      </div>

      {boardOptions.length === 0 ? (
        <p className="text-sm text-text-2">
          Nenhum kanban interno ainda. Abra Atividades para criar o primeiro.
        </p>
      ) : (
        <AutomationsPanel boards={boardOptions} />
      )}
    </div>
  );
}
