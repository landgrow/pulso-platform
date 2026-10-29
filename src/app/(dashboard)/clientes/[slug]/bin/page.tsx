import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeClientSlug } from "@/lib/auth/org-access";
import { resolveBinPeriod } from "@/lib/collections/bin-period";
import { BinWorkspace } from "@/components/bin/bin-workspace";
import { PageHeader } from "@/components/ui/page-header";
import {
  binShareSections,
  buildBinReadingView,
  publicBinInstruments,
  readBinFlow,
  resolveBinRoute,
  resolveBinShareSection,
  type BinAnswers,
} from "@/lib/bin-v2";

export const metadata: Metadata = { title: "BIN" };

interface BinPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ setor?: string }>;
}

export default async function ClienteBinPage({
  params,
  searchParams,
}: BinPageProps): Promise<JSX.Element> {
  const { slug } = await params;
  const { setor } = await searchParams;
  const auth = await authorizeClientSlug(slug);
  if (!auth.ok) notFound();

  const period = await resolveBinPeriod(auth.org.id, { create: true });
  if (!period) {
    return (
      <div className="rounded-lg border border-border bg-surface-1 p-6 text-sm text-error">
        Não foi possível abrir o diagnóstico desta empresa. Fale com a Land
        Grow.
      </div>
    );
  }

  const admin = await createAdminClient();
  const { data: colecao } = await admin
    .from("colecoes")
    .select("payload, metadata")
    .eq("periodo_id", period.periodId)
    .eq("tipo", "formulario")
    .neq("status", "descartado")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const closed = period.status === "fechado" || period.status === "analisado";
  const isReadOnly = closed || !auth.access.canWrite;
  const initialPayload = (colecao?.payload ?? {}) as Partial<BinAnswers>;
  const metadata = colecao?.metadata as Record<string, unknown> | undefined;
  const flow = readBinFlow(metadata);
  // Tela recebe a leitura pronta e o questionário sem pesos/notas.
  const initialView =
    Object.keys(flow.setoresEnviados).length > 0 || flow.diagnosticoEnviadoEm
      ? buildBinReadingView(
          initialPayload as BinAnswers,
          resolveBinRoute(initialPayload as BinAnswers),
          flow,
          { staff: auth.access.platformRole !== null },
        )
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnóstico BIN"
        description={`${auth.org.name} · Responda o diagnóstico geral e depois os setores. Tudo é salvo automaticamente.`}
      />
      <BinWorkspace
        periodoId={period.periodId}
        instruments={publicBinInstruments()}
        shareSections={binShareSections()}
        initialView={initialView}
        initialPayload={initialPayload}
        {...(metadata ? { initialMetadata: metadata } : {})}
        readOnly={isReadOnly}
        shareSlug={slug}
        initialSectionId={resolveBinShareSection(setor, flow.geralEnviadoEm)}
      />
    </div>
  );
}
