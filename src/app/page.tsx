import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Lock, Target, Zap } from "lucide-react";

export default function HomePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-brand-lime flex items-center justify-center">
            <span className="text-brand-lime-foreground font-bold">LG</span>
          </div>
          <span className="text-xl font-semibold">PULSO</span>
        </div>
        <nav>
          <Button asChild>
            <Link href="/login">
              Acessar sistema
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-1 px-4 py-1.5 text-sm text-text-2">
            <Lock className="h-3.5 w-3.5" />
            <span>Acesso restrito · Clientes Land Grow</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Plataforma de inteligência de negócios da Land Grow
          </h1>

          <p className="text-lg text-text-2 max-w-2xl mx-auto">
            Diagnóstico estratégico, gestão de tarefas e plano de ação
            acompanhados pela sua consultoria, em um só lugar.
          </p>

          <div className="pt-4">
            <Button size="lg" asChild>
              <Link href="/login">
                Acessar sistema
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Recursos */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
          <div className="rounded-lg border border-border bg-surface-1 p-6 space-y-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Diagnóstico BIN</h3>
            <p className="text-sm text-text-2">
              Mapeamento da maturidade do negócio em 10 áreas estratégicas e
              identificação de oportunidades de melhoria.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-1 p-6 space-y-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Plano de Ação</h3>
            <p className="text-sm text-text-2">
              Gestão de tarefas e planejamento estratégico acompanhado pela
              equipe Land Grow.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-1 p-6 space-y-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Aceleração</h3>
            <p className="text-sm text-text-2">
              Programa de aceleração de 6 meses com acompanhamento e resultados
              mensuráveis.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-border">
        <p className="text-sm text-text-2 text-center">
          PULSO © 2026 · Land Grow · Plataforma de Inteligência de Negócios
        </p>
      </footer>
    </div>
  );
}
