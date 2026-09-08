import { notFound } from "next/navigation";
import Link from "next/link";
import { listPeriods } from "@/app/actions/periods";
import { requireOrganization } from "@/lib/supabase/organization-server";
import { StatusBadge } from "@/components/collections/periodo/status-badge";
import { AbrirPeriodoAtualButton } from "@/components/collections/periodo/abrir-periodo-atual-button";

interface ClientePageProps {
  params: Promise<{ slug: string }>;
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/**
 * Lista de períodos do cliente. Não fazia parte do File List de nenhuma
 * story específica, mas sem ela o breadcrumb "‹ Nome do cliente" de TODAS as
 * páginas de coleta (Stories 1.3-1.7) apontava para uma rota inexistente —
 * fecha esse buraco usando a action `listPeriods` (Story 1.2), que já
 * existia mas nunca tinha sido consumida por nenhuma UI.
 */
export default async function ClientePage({
  params,
}: ClientePageProps): Promise<JSX.Element> {
  const { slug } = await params;

  const orgCtx = await requireOrganization().catch(() => null);
  if (!orgCtx) notFound();
  if (orgCtx.org.slug !== slug) notFound();

  const periodsResult = await listPeriods({ orgId: orgCtx.org.id });
  const periods = periodsResult.success ? periodsResult.data.periods : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{orgCtx.org.name}</h1>
          <p className="text-sm text-muted-foreground">
            Períodos de coleta de dados.
          </p>
        </div>
        <AbrirPeriodoAtualButton slug={slug} />
      </div>

      {periods.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum período de coleta ainda. Clique em &quot;Abrir coleta deste
          mês&quot; para começar.
        </p>
      ) : (
        <div className="space-y-2">
          {periods.map((period) => (
            <Link
              key={period.id}
              href={`/clientes/${slug}/periodo/${period.id}`}
              className="flex items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">
                {MESES[period.mes - 1]} {period.ano}
              </span>
              <StatusBadge status={period.status} closedAt={period.closed_at} />
              <span className="ml-auto text-xs text-muted-foreground">
                {period.colecoes_count} coleções · {period.evidencias_count}{" "}
                evidências
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
