import Link from "next/link";
import { getActiveOrganization } from "@/lib/supabase/organization-server";
import { getSession } from "@/lib/supabase/get-session";
import { createClient } from "@/lib/supabase/server";
import { getStaffCapabilities } from "@/lib/supabase/platform-role-server";
import { getAtividadesDashboard } from "@/app/actions/boards";
import { getMetricasGerais } from "@/app/actions/metricas";
import { StaffBiDashboard } from "@/components/ops/staff-bi-dashboard";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default async function DashboardPage(): Promise<JSX.Element> {
  const supabase = await createClient();
  const [session, active, caps] = await Promise.all([
    getSession(),
    getActiveOrganization(),
    getStaffCapabilities(supabase),
  ]);

  const userName =
    session?.user.user_metadata?.full_name ??
    session?.user.email?.split("@")[0] ??
    "Usuário";

  if (caps.length > 0) {
    return <StaffHome userName={userName} caps={caps} />;
  }

  if (!active) {
    return (
      <EmptyState
        title={`Bem-vindo, ${userName}`}
        description="Você ainda não tem uma organização. Crie uma para começar."
        action={
          <Button asChild>
            <Link href="/configuracoes/organizacoes">Criar organização</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <PageHeader
        title={userName}
        description={`${active.org.name} — o que está aberto hoje.`}
      />
      <Link
        href="/configuracoes"
        className="block rounded-lg border border-border bg-surface-1 p-5 hover:border-primary/40 transition-colors"
      >
        <p className="text-sm font-semibold">Configurações</p>
        <p className="text-sm text-text-2 mt-1">
          Conta, notificações e dados da sua organização.
        </p>
      </Link>
    </div>
  );
}

async function StaffHome({
  userName,
  caps,
}: {
  userName: string;
  caps: string[];
}): Promise<JSX.Element> {
  const supabase = await createClient();
  const { data: internalOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("is_internal", true)
    .maybeSingle();

  const canAtividades = caps.includes("atividades");
  const canNegocio = caps.includes("metricas") || caps.includes("financeiro");

  const [dash, metricas] = await Promise.all([
    canAtividades && internalOrg
      ? getAtividadesDashboard(internalOrg.id, "atividades")
      : Promise.resolve(null),
    canNegocio ? getMetricasGerais() : Promise.resolve(null),
  ]);

  const stats = dash?.success ? dash.data : null;
  const negocio = metricas?.success ? metricas.data : null;

  return (
    <StaffBiDashboard
      userName={userName}
      stats={
        stats
          ? {
              totalCards: stats.total_cards,
              concluidos: stats.concluidos,
              atrasados: stats.atrasados,
              porSetor: stats.por_setor,
              porResponsavel: stats.por_responsavel,
            }
          : null
      }
      crmLeads={negocio?.crm.totalCards ?? 0}
      crmConvertidos={negocio?.crm.convertidos ?? 0}
      crmConversion={negocio ? negocio.crm.taxaConversao : null}
      receitaBrl={negocio?.financeiro.receitaAtivaPorMoeda.BRL ?? 0}
      receitaContratosBrl={negocio?.financeiro.receitaContratosBrl ?? 0}
      receitaObjetivosBrl={negocio?.financeiro.receitaObjetivosBrl ?? 0}
      finance={
        negocio
          ? {
              mes: negocio.financeiro.mes,
              livroMes: negocio.financeiro.livroMes,
              cashflow: negocio.financeiro.cashflow,
              entradasPorOrigem: negocio.financeiro.entradasPorOrigem,
            }
          : null
      }
    />
  );
}
