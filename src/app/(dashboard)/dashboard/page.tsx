import Link from "next/link";
import { getActiveOrganization } from "@/lib/supabase/organization-server";
import { getSession } from "@/lib/supabase/get-session";
import { createClient } from "@/lib/supabase/server";
import { getStaffCapabilities } from "@/lib/supabase/platform-role-server";
import { getAtividadesDashboard } from "@/app/actions/boards";
import { getMetricasGerais } from "@/app/actions/metricas";
import { PageHeader, EmptyState, KpiCard } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

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

  const isStaff = caps.length > 0;

  if (isStaff) {
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
        title={`Olá, ${userName}`}
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
  const canMetricas = caps.includes("metricas");

  const [dash, metricas] = await Promise.all([
    canAtividades && internalOrg
      ? getAtividadesDashboard(internalOrg.id, "atividades")
      : Promise.resolve(null),
    canMetricas ? getMetricasGerais() : Promise.resolve(null),
  ]);

  const stats = dash?.success ? dash.data : null;
  const negocio = metricas?.success ? metricas.data : null;
  const receitaBrl = negocio?.financeiro.receitaAtivaPorMoeda.BRL ?? 0;

  return (
    <div className="space-y-8 max-w-6xl">
      <PageHeader
        title={`Olá, ${userName}`}
        description="Casa da Land Grow: nossas atividades, CRM e faturamento. A carteira de clientes está no Painel."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Cards abertos"
          value={String(stats?.total_cards ?? 0)}
          hint="Plano de Ação interno"
          accent="primary"
        />
        <KpiCard
          label="Atrasados"
          value={String(stats?.atrasados ?? 0)}
          hint="Prazo vencido"
          accent="neutral"
        />
        <KpiCard
          label="Leads no CRM"
          value={String(negocio?.crm.totalCards ?? 0)}
          hint={
            negocio
              ? `${negocio.crm.taxaConversao.toFixed(0)}% convertidos`
              : "Abra Métricas para o funil"
          }
          accent="primary"
        />
        <KpiCard
          label="Receita ativa"
          value={formatCurrency(receitaBrl)}
          hint="Contratos ativos em BRL"
          accent="lime"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {canAtividades ? (
          <Link
            href="/admin/atividades"
            className="rounded-lg border border-border bg-surface-1 p-5 hover:border-primary/40 transition-colors"
          >
            <p className="text-sm font-semibold">Atividades</p>
            <p className="text-sm text-text-2 mt-1">
              WorkSmart e Plano de Ação da Land Grow.
            </p>
          </Link>
        ) : null}
        {caps.includes("crm") ? (
          <Link
            href="/admin/crm"
            className="rounded-lg border border-border bg-surface-1 p-5 hover:border-primary/40 transition-colors"
          >
            <p className="text-sm font-semibold">CRM</p>
            <p className="text-sm text-text-2 mt-1">
              Leads e parceiros — funil comercial nosso.
            </p>
          </Link>
        ) : null}
        {canMetricas ? (
          <Link
            href="/admin/metricas"
            className="rounded-lg border border-border bg-surface-1 p-5 hover:border-primary/40 transition-colors"
          >
            <p className="text-sm font-semibold">Métricas</p>
            <p className="text-sm text-text-2 mt-1">
              Detalhe do funil e dos contratos.
            </p>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
