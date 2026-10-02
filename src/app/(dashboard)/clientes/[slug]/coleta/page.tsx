import { notFound } from "next/navigation";
import Link from "next/link";
import { listPeriods } from "@/app/actions/periods";
import { authorizeClientSlug } from "@/lib/auth/org-access";
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

/** Lista de períodos de coleta (uploads, texto livre) do cliente. */
export default async function ColetaPage({
  params,
}: ClientePageProps): Promise<JSX.Element> {
  const { slug } = await params;

  const auth = await authorizeClientSlug(slug);
  if (!auth.ok) notFound();
  const orgCtx = { org: auth.org };

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
        <AbrirPeriodoAtualButton slug={slug} orgId={auth.org.id} />
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
