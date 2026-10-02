import { notFound } from "next/navigation";
import { authorizeClientSlug } from "@/lib/auth/org-access";
import { getMinSummaryForOrg } from "@/app/actions/min";
import { MinWorkspace } from "@/components/min/min-workspace";
import { PageHeader } from "@/components/ui/page-header";
import { MIN_GUIDES, type MinBlocoNome } from "@/lib/min/blocks";

export default async function ClienteMinPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const auth = await authorizeClientSlug(slug);
  if (!auth.ok) notFound();

  const summary = await getMinSummaryForOrg(auth.org.id);
  const initialAnswers: Record<string, Record<number, string>> = {};
  if (summary.success) {
    for (const bloco of summary.data.blocos) {
      const guides = MIN_GUIDES[bloco.bloco as MinBlocoNome];
      if (!guides) continue;
      const bag: Record<number, string> = {};
      for (const p of bloco.perguntas) {
        const i = guides.indexOf(p.prompt);
        if (i >= 0) bag[i] = p.answer;
      }
      initialAnswers[bloco.bloco] = bag;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modelo Integrado de Negócios"
        description={`${auth.org.name} · 13 blocos em 3 fases. Responda uma pergunta por vez — cada resposta é salva e chega na Land Grow.`}
      />
      {!summary.success ? (
        <p className="rounded-lg border border-border bg-surface-1 p-4 text-sm text-error">
          Não consegui carregar o MIN: {summary.error}
        </p>
      ) : null}
      <MinWorkspace
        slug={slug}
        initialAnswers={initialAnswers}
        readOnly={!auth.access.canWrite}
      />
    </div>
  );
}
