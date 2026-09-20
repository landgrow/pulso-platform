"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PROGRAMA_LABELS, type ClientDirectoryEntry } from "@/types/clientes";
import { splitDueCards } from "@/lib/ops/due";
import { useDueFeed } from "@/hooks/use-due-feed";
import { DueBoardBody } from "@/components/ops/due-feed";
import { EmptyState } from "@/components/ui/page-header";

function programasAtivos(entry: ClientDirectoryEntry): string {
  const ativos = entry.contratos.filter((c) => c.status === "ativo");
  if (ativos.length === 0) return "Sem programa ativo";
  return ativos
    .map((c) => PROGRAMA_LABELS[c.programa].split(" —")[0])
    .join(" · ");
}

export function PainelLive({
  ativos,
}: {
  ativos: ClientDirectoryEntry[];
}): JSX.Element {
  const feed = useDueFeed();
  const { cards, today } = feed;

  return (
    <div className="space-y-8">
      <DueBoardBody
        scope="clientes"
        cards={feed.cards}
        today={feed.today}
        loading={feed.loading}
        error={feed.error}
        live={feed.live}
        horizonDays={feed.horizonDays}
      />

      <div>
        <h2 className="text-lg font-semibold mb-3">Carteira</h2>
        {ativos.length === 0 ? (
          <EmptyState
            title="Nenhum cliente ativo"
            description="Quando houver carteira, cada empresa aparece aqui com os prazos do Plano de Ação."
            action={
              <Link href="/admin/clientes" className="text-sm text-primary">
                Ir para Organizações
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {ativos.map((c) => {
              const orgCards = cards.filter((card) => card.orgId === c.org_id);
              const split = today
                ? splitDueCards(orgCards, today)
                : { atrasadas: [], hoje: [], aVencer: [] };
              return (
                <Link
                  key={c.org_id}
                  href={`/admin/clientes/${c.slug}`}
                  className="rounded-lg border border-border bg-surface-1 p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{c.name}</p>
                    <Badge variant="success">Ativo</Badge>
                  </div>
                  <p className="text-sm text-text-2 mt-1">
                    {programasAtivos(c)}
                  </p>
                  <p className="text-xs text-text-2 mt-2">
                    {c.owner_name ?? c.owner_email ?? "Sem dono"} ·{" "}
                    {c.member_emails.length}{" "}
                    {c.member_emails.length === 1 ? "acesso" : "acessos"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {split.atrasadas.length > 0 ? (
                      <Badge variant="destructive">
                        {split.atrasadas.length} atrasada
                        {split.atrasadas.length === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                    {split.hoje.length > 0 ? (
                      <Badge variant="warning">{split.hoje.length} hoje</Badge>
                    ) : null}
                    {split.aVencer.length > 0 ? (
                      <Badge variant="outline">
                        {split.aVencer.length} a vencer
                      </Badge>
                    ) : null}
                    {orgCards.length === 0 ? (
                      <span className="text-xs text-text-2">
                        Sem prazos abertos
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
