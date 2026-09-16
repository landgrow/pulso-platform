import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStaffCapabilities } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { listBoards } from "@/app/actions/boards";
import { AutomationsPanel } from "@/components/atividades/automations-panel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  ApplyTemplateButton,
  RunNotificationsButton,
} from "@/components/settings/operacao-actions";
import { PLANO_DE_ACAO_COLUMNS } from "@/lib/boards/plano-de-acao-template";

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
    <div className="space-y-8">
      <PageHeader
        title="Operação"
        description="Modelo do Plano de Ação, automações ao mover card e disparo dos e-mails de prazo e reunião."
        actions={<RunNotificationsButton />}
      />

      <section className="rounded-lg border border-border bg-surface-1 p-5 space-y-3">
        <h2 className="text-sm font-semibold">Modelo Plano de Ação</h2>
        <p className="text-sm text-text-2">
          Kanban novo de Atividades já nasce com estas colunas e o campo
          Urgência. Board antigo recebe o que ainda faltar, sem apagar o que
          você já usa.
        </p>
        <p className="text-xs text-text-3">
          {PLANO_DE_ACAO_COLUMNS.map((c) => c.label).join(" · ")}
        </p>
        <div className="flex flex-wrap gap-2">
          {boardOptions.map((board) => (
            <div
              key={board.id}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
            >
              <span className="text-sm">{board.name}</span>
              <ApplyTemplateButton boardId={board.id} boardName={board.name} />
            </div>
          ))}
        </div>
      </section>

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
