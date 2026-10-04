import { notFound } from "next/navigation";
import { authorizeClientSlug } from "@/lib/auth/org-access";
import { MeetingsPanel } from "@/components/atividades/meetings-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function ClienteReunioesPage({
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
        title="Reuniões"
        description={`${auth.org.name} · Registro das reuniões com resumo, tópicos e checklist.`}
      />
      <MeetingsPanel orgId={auth.org.id} hideTitle />
    </div>
  );
}
