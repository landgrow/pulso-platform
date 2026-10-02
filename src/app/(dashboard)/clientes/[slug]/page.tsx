import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, CalendarClock, Radar } from "lucide-react";
import { authorizeClientSlug } from "@/lib/auth/org-access";
import {
  loadPortalOverview,
  parseRange,
  PERIOD_RANGE_LABEL,
} from "@/lib/client-portal/overview";
import { RangeSelect } from "@/components/client-portal/range-select";
import {
  SimpleBars,
  StatusDonut,
} from "@/components/client-portal/portal-charts";
import { EmptyState, KpiCard } from "@/components/ui/page-header";
import { cn, formatDate } from "@/lib/utils";

const PRIORIDADE_CLASS: Record<string, string> = {
  alta: "bg-error/10 text-error",
  media: "bg-warning/10 text-warning",
  baixa: "bg-surface-2 text-text-2",
};

const PRIORIDADE_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

function firstName(user: {
  user_metadata?: Record<string, unknown>;
  email?: string;
}): string {
  const full = user.user_metadata?.full_name;
  if (typeof full === "string" && full.trim())
    return full.trim().split(/\s+/)[0] ?? full;
  return "";
}

/** Painel do cliente — mesmo recorte do protótipo: BIN, MIN, tarefas e métricas. */
export default async function ClientePainelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ periodo?: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const { periodo } = await searchParams;
  const auth = await authorizeClientSlug(slug);
  if (!auth.ok) notFound();

  const range = parseRange(periodo);
  const data = await loadPortalOverview(auth.org.id, range);
  const name = firstName(auth.access.user);
  const upcoming = data.tasks
    .filter((t) => t.bucket !== "concluida")
    .sort((a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"))
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text-1 text-balance">
            {name ? `Olá, ${name}` : `Seja bem-vindo(a), ${auth.org.name}`}
          </h1>
          <p className="text-sm text-text-2">
            {auth.org.name} · BIN, MIN, tarefas e métricas no recorte escolhido.
          </p>
        </div>
        <RangeSelect value={range} />
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-2">
          Diagnóstico e modelo de negócio
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <InsightCard
            href={`/clientes/${slug}/bin`}
            icon={<Radar className="h-5 w-5" />}
            accent="var(--primary)"
            title="BIN"
            subtitle="Business Insights Navigator"
            pct={data.binPct}
            text="Diagnóstico geral e os setores da empresa."
          />
          <InsightCard
            href={`/clientes/${slug}/min`}
            icon={<Briefcase className="h-5 w-5" />}
            accent="#8b5cf6"
            title="MIN"
            subtitle="Modelo Integrado de Negócios"
            pct={data.minPct}
            text={`${data.minBlocos} de 13 blocos com respostas.`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-2">
            Tarefas do período
          </h2>
          <Link
            href={`/clientes/${slug}/atividades`}
            className="text-xs font-medium text-primary hover:underline"
          >
            Abrir Atividades
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            title="Nenhuma tarefa pendente neste recorte"
            description="Quando a Land Grow ou o seu time criar tarefas no Plano de Ação, as próximas aparecem aqui."
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-1">
            {upcoming.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-text-1">
                  {t.titulo}
                </span>
                <span className="text-xs text-text-3">{t.boardName}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    PRIORIDADE_CLASS[t.prioridade] ?? PRIORIDADE_CLASS.baixa,
                  )}
                >
                  {PRIORIDADE_LABEL[t.prioridade] ?? t.prioridade}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs tabular-nums",
                    t.atrasada ? "text-error" : "text-text-2",
                  )}
                >
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                  {t.prazo ? formatDate(t.prazo) : "Sem prazo"}
                  {t.atrasada ? " · atrasada" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-2">
          Visão das tarefas · {PERIOD_RANGE_LABEL[range]}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Todas as tarefas"
            value={String(data.stats.total)}
            accent="neutral"
          />
          <KpiCard
            label="Em andamento"
            value={String(data.stats.andamento)}
            accent="primary"
          />
          <KpiCard
            label="Atrasadas"
            value={String(data.stats.atrasadas)}
            accent="neutral"
          />
          <KpiCard
            label="Concluídas"
            value={String(data.stats.concluidas)}
            accent="lime"
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <StatusDonut
            title="Tarefas por status"
            hint={PERIOD_RANGE_LABEL[range]}
            data={data.byStatus}
            colors={["var(--text-3)", "var(--primary)", "var(--success)"]}
          />
          <SimpleBars
            title="Em dia, atrasadas e concluídas"
            hint={PERIOD_RANGE_LABEL[range]}
            data={data.byPrazo}
            colors={["var(--primary)", "var(--error)", "var(--success)"]}
            emptyText="Nenhuma tarefa no recorte."
          />
        </div>
      </section>
    </div>
  );
}

function InsightCard({
  href,
  icon,
  accent,
  title,
  subtitle,
  pct,
  text,
}: {
  href: string;
  icon: React.ReactNode;
  accent: string;
  title: string;
  subtitle: string;
  pct: number;
  text: string;
}): JSX.Element {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-5 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: accent }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-text-1">{title}</p>
          <p className="text-sm" style={{ color: accent }}>
            {subtitle}
          </p>
        </div>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold tabular-nums text-text-1">
          {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>
      <p className="text-sm text-text-2">{text}</p>
    </Link>
  );
}
