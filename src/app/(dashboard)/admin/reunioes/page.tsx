import { requireInternalOrg } from "@/lib/auth/internal-org";
import { MeetingsPanel } from "@/components/atividades/meetings-panel";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminMeetingsPanelPage(): Promise<JSX.Element> {
  const internal = await requireInternalOrg("atividades");
  if (!internal.ok) return <AccessDenied message={internal.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reuniões"
        description="Reuniões internas da Land Grow com resumo, tópicos e checklist."
      />
      <MeetingsPanel orgId={internal.orgId} hideTitle />
    </div>
  );
}
