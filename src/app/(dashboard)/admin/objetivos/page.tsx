import { requireInternalOrg } from "@/lib/auth/internal-org";
import { WorksmartPanel } from "@/components/atividades/worksmart-panel";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminWorksmartPanelPage(): Promise<JSX.Element> {
  const internal = await requireInternalOrg("atividades");
  if (!internal.ok) return <AccessDenied message={internal.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Objetivos"
        description="Objetivos SMART da Land Grow, resultados-chave e as ações que viram tarefas."
      />
      <WorksmartPanel orgId={internal.orgId} hideTitle />
    </div>
  );
}
