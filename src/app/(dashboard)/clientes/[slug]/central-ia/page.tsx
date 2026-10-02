import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { authorizeClientSlug } from "@/lib/auth/org-access";
import { EmptyState, PageHeader } from "@/components/ui/page-header";

export default async function ClienteCentralIaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const auth = await authorizeClientSlug(slug);
  if (!auth.ok) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central IA"
        description="Perguntas sobre a sua empresa respondidas com base no BIN, no MIN e nas atividades."
      />
      <EmptyState
        title="Em construção"
        description="A Central IA vai cruzar o diagnóstico, o modelo de negócio e o plano de ação da sua empresa. Avisamos aqui quando estiver liberada."
        action={<Sparkles className="h-5 w-5 text-text-3" aria-hidden />}
      />
    </div>
  );
}
