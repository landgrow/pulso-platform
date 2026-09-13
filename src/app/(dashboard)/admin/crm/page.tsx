import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { CrmShell } from "@/components/crm/crm-shell";

export default async function AdminCrmPage(): Promise<JSX.Element> {
  const supabase = await createClient();

  try {
    await requirePlatformAdmin(supabase);
  } catch (e) {
    return (
      <AccessDenied
        message={
          e instanceof Error
            ? e.message
            : "Apenas administradores da plataforma."
        }
      />
    );
  }

  const { data: internalOrg, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("is_internal", true)
    .single();

  if (error || !internalOrg) {
    return (
      <AccessDenied message="Organização interna não encontrada. Rode a migration 0012_operacao_interna.sql no Supabase." />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
          <Badge variant="outline" className="text-text-2">
            admin only
          </Badge>
        </div>
        <p className="text-text-2">
          Kanbans de CRM (Leads, Parceiros etc) — mesma estrutura de Atividades,
          com propriedades personalizadas, filtros e configurações. Converter um
          card em cliente cria a organização de verdade e envia o convite de
          acesso.
        </p>
      </div>

      <CrmShell orgId={internalOrg.id} />
    </div>
  );
}
