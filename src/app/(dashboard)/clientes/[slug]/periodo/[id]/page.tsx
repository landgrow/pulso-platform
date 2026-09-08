import { notFound } from "next/navigation";
import Link from "next/link";
import { getPeriod } from "@/app/actions/periods";
import { requireOrganization } from "@/lib/supabase/organization-server";
import { createClient } from "@/lib/supabase/server";
import {
  calcProgresso,
  type FormularioPayload,
} from "@/lib/validations/formulario";
import { StatusBadge } from "@/components/collections/periodo/status-badge";
import { CardColetaTipo } from "@/components/collections/periodo/card-coleta-tipo";
import { BotaoMarcarPronto } from "@/components/collections/periodo/botao-marcar-pronto";
import { ListaColecoes } from "@/components/collections/periodo/lista-colecoes";
import { ListaEvidenciasPeriodo } from "@/components/collections/periodo/lista-evidencias-periodo";
import { FileText, UploadCloud, NotebookPen, Mic, History } from "lucide-react";

interface PeriodoPageProps {
  params: Promise<{ slug: string; id: string }>;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  return `há ${days}d`;
}

export default async function PeriodoPage({
  params,
}: PeriodoPageProps): Promise<JSX.Element> {
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
  const { periodo, colecoes, evidencias, canEdit, role } =
    periodDetail.data.period;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const formularioColecao = colecoes.find(
    (c) => c.tipo === "formulario" && c.status !== "descartado",
  );
  const formularioProgresso = formularioColecao
    ? calcProgresso(formularioColecao.payload as Partial<FormularioPayload>)
    : 0;

  const textosAtivos = colecoes.filter(
    (c) => c.tipo === "texto_livre" && c.status !== "descartado",
  );
  const audiosAtivos = evidencias.filter((e) => e.tipo === "audio");

  const totalUploadBytes = evidencias.reduce(
    (sum, e) => sum + e.tamanho_bytes,
    0,
  );
  const lastEvidenciaAt = evidencias.length
    ? evidencias.reduce(
        (max, e) => (e.created_at > max ? e.created_at : max),
        "",
      )
    : null;
  const lastTextoAt = textosAtivos.length
    ? textosAtivos.reduce(
        (max, c) => (c.updated_at > max ? c.updated_at : max),
        "",
      )
    : null;

  const outrasFontesCount = textosAtivos.length + evidencias.length;
  const meetsDefaultRule = formularioProgresso === 100 && outrasFontesCount > 0;
  const canOverride = role === "client_owner" || role === "platform_admin";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link
            href={`/clientes/${slug}`}
            className="transition-colors hover:text-foreground"
          >
            {orgCtx.org.name}
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">
            Período {periodo.mes}/{periodo.ano}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">
            {String(periodo.mes).padStart(2, "0")}/{periodo.ano}
          </h1>
          <StatusBadge status={periodo.status} closedAt={periodo.closed_at} />
          <Link
            href={`/clientes/${slug}/periodo/${id}/historico`}
            className="ml-auto flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <History className="size-4" aria-hidden="true" />
            Histórico de alterações
          </Link>
        </div>

        {canEdit && periodo.status === "em_coleta" && (
          <BotaoMarcarPronto
            periodId={id}
            formularioProgresso={formularioProgresso}
            outrasFontesCount={outrasFontesCount}
            meetsDefaultRule={meetsDefaultRule}
            canOverride={canOverride}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CardColetaTipo
          icon={FileText}
          label="Formulário"
          primaryStat={`${formularioProgresso}%`}
          secondaryStat={
            formularioColecao
              ? formatRelative(formularioColecao.updated_at)
              : "não iniciado"
          }
          href={`/clientes/${slug}/coleta/formulario`}
        />
        <CardColetaTipo
          icon={UploadCloud}
          label="Uploads"
          primaryStat={`${evidencias.length} arq.`}
          secondaryStat={
            evidencias.length
              ? `${(totalUploadBytes / 1024 / 1024).toFixed(1)} MB · ${formatRelative(lastEvidenciaAt)}`
              : "nenhum ainda"
          }
          href={`/clientes/${slug}/coleta/upload`}
        />
        <CardColetaTipo
          icon={NotebookPen}
          label="Texto Livre"
          primaryStat={`${textosAtivos.length}`}
          secondaryStat={
            textosAtivos.length ? formatRelative(lastTextoAt) : "nenhum ainda"
          }
          href={`/clientes/${slug}/coleta/texto`}
        />
        <CardColetaTipo
          icon={Mic}
          label="Áudio"
          primaryStat={`${audiosAtivos.length}`}
          disabledNote="Em breve"
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Coleções</h2>
        <ListaColecoes colecoes={colecoes} slug={slug} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Evidências ({evidencias.length})
        </h2>
        <ListaEvidenciasPeriodo
          initialEvidencias={evidencias}
          currentUserId={user?.id ?? null}
          canDeleteAny={role === "platform_admin"}
          readOnly={!canEdit}
        />
      </div>
    </div>
  );
}
