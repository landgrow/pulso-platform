import { notFound } from "next/navigation";
import { getOrCreateCurrentPeriod, getPeriod } from "@/app/actions/periods";
import { getColecao } from "@/app/actions/colecoes";
import { requireOrganization } from "@/lib/supabase/organization-server";
import { BinWorkspace } from "@/components/bin/bin-workspace";
import type { BinAnswers } from "@/lib/bin-v2";

interface BinPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClienteBinPage({
  params,
}: BinPageProps): Promise<JSX.Element> {
  const { slug } = await params;
  const orgCtx = await requireOrganization().catch(() => null);
  if (!orgCtx || orgCtx.org.slug !== slug) notFound();

  const periodResult = await getOrCreateCurrentPeriod();
  if (!periodResult.success) {
    return (
      <div className="p-6 text-destructive">
        Erro ao abrir o diagnóstico: {periodResult.error}
      </div>
    );
  }
  const { periodId } = periodResult.data;
  const periodDetail = await getPeriod({ periodId });
  const isReadOnly = !periodDetail.success || !periodDetail.data.period.canEdit;
  const colecaoResult = await getColecao(periodId, "formulario");
  const colecao =
    colecaoResult.success && colecaoResult.data.colecao
      ? colecaoResult.data.colecao
      : null;
  const initialPayload: Partial<BinAnswers> = colecao
    ? (colecao.payload as Partial<BinAnswers>)
    : {};

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{orgCtx.org.name}</p>
        <h1 className="text-2xl font-bold tracking-tight">
          Business Insights Navigator
        </h1>
      </div>
      <BinWorkspace
        periodoId={periodId}
        initialPayload={initialPayload}
        {...(colecao?.metadata ? { initialMetadata: colecao.metadata } : {})}
        readOnly={isReadOnly}
      />
    </div>
  );
}
