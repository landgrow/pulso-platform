import { notFound } from "next/navigation";
import { authorizeClientSlug } from "@/lib/auth/org-access";
import { WorksmartPanel } from "@/components/atividades/worksmart-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function ClienteObjetivosPage({
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
        title="Objetivos"
        description={`${auth.org.name} · Objetivos SMART, resultados-chave e as ações que viram tarefas nas listas.`}
      />
      <WorksmartPanel orgId={auth.org.id} hideTitle />
    </div>
  );
}
