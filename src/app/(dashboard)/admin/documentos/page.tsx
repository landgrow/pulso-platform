import type { Metadata } from "next";
import { requireInternalOrg } from "@/lib/auth/internal-org";
import { DocumentsDrive } from "@/components/documentos/documents-drive";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Documentos" };

export default async function AdminDocumentosPage(): Promise<JSX.Element> {
  const internal = await requireInternalOrg("documentos");
  if (!internal.ok) return <AccessDenied message={internal.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos"
        description="Arquivos da Land Grow: contratos, propostas, planilhas e evidências internas."
      />
      <DocumentsDrive orgId={internal.orgId} />
    </div>
  );
}
