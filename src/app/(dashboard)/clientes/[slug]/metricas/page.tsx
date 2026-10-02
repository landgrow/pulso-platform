import Link from "next/link";
import { notFound } from "next/navigation";
import { authorizeClientSlug } from "@/lib/auth/org-access";
import {
  loadPortalMetrics,
  loadPortalOverview,
} from "@/lib/client-portal/overview";
import { SimpleBars } from "@/components/client-portal/portal-charts";
import { EmptyState, KpiCard, PageHeader } from "@/components/ui/page-header";

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  concluido: "Concluído",
};

function formatValue(n: number, unit: string | null): string {
  const v = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
  return unit ? `${v} ${unit}` : v;
}

export default async function ClienteMetricasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const auth = await authorizeClientSlug(slug);
  if (!auth.ok) notFound();

  const [{ objectives, krs }, overview] = await Promise.all([
    loadPortalMetrics(auth.org.id),
    loadPortalOverview(auth.org.id, "ano"),
  ]);

  const ativos = objectives.filter((o) => o.status !== "concluido").length;
  const concluidos = objectives.filter((o) => o.status === "concluido").length;
  const krMedio =
    krs.length > 0
      ? Math.round(krs.reduce((n, k) => n + k.pct, 0) / krs.length)
      : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Métricas"
        description={`${auth.org.name} · Objetivos, resultados-chave e o andamento do diagnóstico.`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Objetivos em aberto"
          value={String(ativos)}
          accent="primary"
        />
        <KpiCard
          label="Objetivos concluídos"
          value={String(concluidos)}
          accent="lime"
        />
        <KpiCard
          label="Resultados-chave"
          value={String(krs.length)}
          accent="neutral"
        />
        <KpiCard
          label="Média dos KRs"
          value={`${krMedio}%`}
          hint="do alvo atingido"
          accent="neutral"
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-2">
            Progresso dos objetivos
          </h2>
          <Link
            href={`/clientes/${slug}/atividades`}
            className="text-xs font-medium text-primary hover:underline"
          >
            Editar em Atividades
          </Link>
        </div>
        {objectives.length === 0 ? (
          <EmptyState
            title="Nenhum objetivo ainda"
            description="Os objetivos do WorkSmart (em Atividades → Objetivos) aparecem aqui com o progresso dos resultados-chave."
          />
        ) : (
          <ul className="space-y-3 rounded-lg border border-border bg-surface-1 p-4">
            {objectives.map((o) => (
              <li key={o.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-text-1">
                    {o.title}
                  </span>
                  <span className="shrink-0 text-xs text-text-2">
                    {STATUS_LABEL[o.status] ?? o.status} ·{" "}
                    <span className="tabular-nums text-text-1">{o.pct}%</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${o.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <SimpleBars
          title="Resultados-chave"
          hint="% do alvo atingido"
          unit="%"
          max={100}
          data={krs.map((k) => ({ label: k.title.slice(0, 18), value: k.pct }))}
          colors={["var(--primary)"]}
          emptyText="Nenhum resultado-chave cadastrado."
        />
        <SimpleBars
          title="Diagnóstico"
          hint="% respondido"
          unit="%"
          max={100}
          data={[
            { label: "BIN", value: overview.binPct },
            { label: "MIN", value: overview.minPct },
          ]}
          colors={["var(--primary)", "#8b5cf6"]}
          emptyText="O BIN e o MIN ainda não foram respondidos."
        />
      </div>

      {krs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-2">
            Detalhe dos resultados-chave
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-xs text-text-2">
                <tr>
                  <th className="px-4 py-2 font-medium">Resultado-chave</th>
                  <th className="px-4 py-2 font-medium">Objetivo</th>
                  <th className="px-4 py-2 text-right font-medium">Atual</th>
                  <th className="px-4 py-2 text-right font-medium">Alvo</th>
                  <th className="px-4 py-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface-1">
                {krs.map((k) => (
                  <tr key={k.id}>
                    <td className="px-4 py-2 text-text-1">{k.title}</td>
                    <td className="px-4 py-2 text-text-2">{k.objective}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatValue(k.current, k.unit)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-text-2">
                      {k.target === null ? "—" : formatValue(k.target, k.unit)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {k.pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
