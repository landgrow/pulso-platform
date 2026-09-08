import { getActiveOrganization } from "@/lib/supabase/organization-server";
import { getSession } from "@/lib/supabase/get-session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUp,
  Target,
  Users,
  BarChart3,
  ArrowRight,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage(): Promise<JSX.Element> {
  const [session, active] = await Promise.all([
    getSession(),
    getActiveOrganization(),
  ]);

  const userName =
    session?.user.user_metadata?.full_name ??
    session?.user.email?.split("@")[0] ??
    "Usuário";

  if (!active) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Bem-vindo, {userName}!</h1>
        <p className="text-text-2 mb-6">
          Você ainda não tem uma organização. Crie uma para começar.
        </p>
        <a
          href="/configuracoes/organizacoes"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Criar organização
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Olá, {userName}</h1>
          <Badge variant="outline" className="text-text-2">
            {active.org.name}
          </Badge>
        </div>
        <p className="text-text-2">
          Bem-vindo de volta. Acompanhe a evolução da sua empresa.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <ArrowRight className="h-4 w-4 text-text-2 group-hover:text-primary transition-colors" />
            </div>
            <CardTitle className="text-lg">Diagnóstico BIN</CardTitle>
            <CardDescription>
              Mapeie a maturidade do seu negócio em 10 áreas
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-brand-lime/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-brand-lime" />
              </div>
              <ArrowRight className="h-4 w-4 text-text-2 group-hover:text-primary transition-colors" />
            </div>
            <CardTitle className="text-lg">Plano de Ação</CardTitle>
            <CardDescription>
              Suas tarefas e OKRs em um só lugar
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <ArrowRight className="h-4 w-4 text-text-2 group-hover:text-primary transition-colors" />
            </div>
            <CardTitle className="text-lg">Programa de Aceleração</CardTitle>
            <CardDescription>
              Acompanhe o progresso do seu programa de 6 meses
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Status */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Maturidade Geral</CardDescription>
            <CardTitle className="text-3xl">0%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-2">Inicie o diagnóstico BIN</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Tarefas Ativas</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-2">Nenhuma tarefa em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Equipe</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Users className="h-6 w-6" /> 1
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-2">Apenas você por enquanto</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
