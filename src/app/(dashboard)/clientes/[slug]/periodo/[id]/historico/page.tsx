import { notFound } from "next/navigation";
import { getPeriod } from "@/app/actions/periods";
import { listColecaoRevisions } from "@/app/actions/revisions";
import { requireOrganization } from "@/lib/supabase/organization-server";
import { createClient } from "@/lib/supabase/server";
import { Timeline } from "@/components/collections/historico/timeline";
import { History } from "lucide-react";

interface HistoricoPageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function HistoricoPage({
  params,
}: HistoricoPageProps): Promise<JSX.Element> {
  const { slug, id } = await params;

  const orgCtx = await requireOrganization().catch(() => null);
  if (!orgCtx) notFound();
  if (orgCtx.org.slug !== slug) notFound();

  const periodDetail = await getPeriod({ periodId: id });
  if (!periodDetail.success) {
    return (
      <div className="p-6 text-destructive">
        Erro ao carregar período: {periodDetail.error}
      </div>
    );
  }

  const revisionsResult = await listColecaoRevisions({ periodoId: id });
  const entries = revisionsResult.success ? revisionsResult.data.entries : [];

  const canRestore = periodDetail.data.period.canEdit;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <div className="mb-2 flex items-center gap-3 text-sm text-muted-foreground">
          <a
            href={`/clientes/${slug}`}
            className="transition-colors hover:text-foreground"
          >
            {orgCtx.org.name}
          </a>
          <span>/</span>
          <span>
            Período {periodDetail.data.period.periodo.mes}/
            {periodDetail.data.period.periodo.ano}
          </span>
          <span>/</span>
          <span className="font-medium text-foreground">Histórico</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <History className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Histórico de Alterações</h1>
            <p className="text-sm text-muted-foreground">
              Todas as versões das coleções deste período, mais recentes
              primeiro.
            </p>
          </div>
        </div>
      </div>

      <Timeline
        entries={entries}
        currentUserId={user?.id ?? null}
        canRestore={canRestore}
      />
    </div>
  );
}
