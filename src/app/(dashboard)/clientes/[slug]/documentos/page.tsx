import { notFound } from "next/navigation";
import { authorizeClientSlug } from "@/lib/auth/org-access";
import { DocumentsDrive } from "@/components/documentos/documents-drive";
import { PageHeader } from "@/components/ui/page-header";

export default async function ClienteDocumentosPage({
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
        title="Documentos"
        description="Arquivos do negócio para a Land Grow analisar: contratos, planilhas, extratos, relatórios."
      />
      <DocumentsDrive orgId={auth.org.id} />
    </div>
  );
}
