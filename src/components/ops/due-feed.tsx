"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock, Loader2, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PRIORIDADE_LABELS } from "@/types/boards";
import { formatDate, cn } from "@/lib/utils";
import { splitDueCards, type DueCard } from "@/lib/ops/due";
import { useDueFeed } from "@/hooks/use-due-feed";

function LiveDot({ live }: { live: boolean }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-text-2">
      <Radio className={cn("h-3 w-3", live ? "text-success" : "text-text-2")} />
      {live ? "Ao vivo" : "Atualiza a cada 30s"}
    </span>
  );
}

function DueRow({
  card,
  today,
}: {
  card: DueCard;
  today: string;
}): JSX.Element {
  const kind =
    card.prazo < today
      ? "atrasada"
      : card.prazo === today
        ? "hoje"
        : "a_vencer";
  return (
    <Link
      href={card.href}
      className="block rounded-lg border border-border bg-surface-1 px-3 py-2.5 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{card.titulo}</p>
        <Badge
          variant={
            kind === "atrasada"
              ? "destructive"
              : kind === "hoje"
                ? "warning"
                : "outline"
          }
          className="shrink-0"
        >
          {kind === "atrasada"
            ? "Atrasada"
            : kind === "hoje"
              ? "Hoje"
              : formatDate(card.prazo)}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-text-2">
        {card.isInternal ? "Land Grow" : card.orgName}
        {card.relatedOrgName && card.isInternal
          ? ` · ${card.relatedOrgName}`
          : ""}
        {" · "}
        {card.boardName}
        {" · "}
        {card.columnLabel}
        {card.responsavelNome ? ` · ${card.responsavelNome}` : ""}
        {" · "}
        {PRIORIDADE_LABELS[card.prioridade]}
      </p>
    </Link>
  );
}

export function DueActivityList({
  title,
  cards,
  today,
  empty,
}: {
  title: string;
  cards: DueCard[];
  today: string;
  empty: string;
}): JSX.Element {
  const split = splitDueCards(cards, today);
  const ordered = [...split.atrasadas, ...split.hoje, ...split.aVencer];
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs tabular-nums text-text-2">
          {ordered.length}
        </span>
      </div>
      {ordered.length === 0 ? (
        <p className="text-sm text-text-2 rounded-lg border border-dashed border-border px-3 py-6 text-center">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">
          {ordered.map((card) => (
            <DueRow key={card.id} card={card} today={today} />
          ))}
        </div>
      )}
    </section>
  );
}

export function DueBoardBody({
  scope,
  cards,
  today,
  loading,
  error,
  live,
  horizonDays,
}: {
  scope: "all" | "interna" | "clientes";
  cards: DueCard[];
  today: string;
  loading: boolean;
  error: string | null;
  live: boolean;
  horizonDays: number;
}): JSX.Element {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-text-2">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando prazos...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  const filtered =
    scope === "interna"
      ? cards.filter((c) => c.isInternal)
      : scope === "clientes"
        ? cards.filter((c) => !c.isInternal)
        : cards;
  const split = splitDueCards(filtered, today);
  const clientes = cards.filter((c) => !c.isInternal);
  const internas = cards.filter((c) => c.isInternal);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {scope === "interna"
              ? "Nossos prazos"
              : scope === "clientes"
                ? "Prazos dos clientes"
                : "Prazos em tempo real"}
          </h2>
          <p className="text-sm text-text-2">
            {scope === "interna"
              ? `Atividades internas atrasadas, de hoje e dos próximos ${horizonDays} dias.`
              : `Atrasadas, que vencem hoje e as dos próximos ${horizonDays} dias.`}
          </p>
        </div>
        <LiveDot live={live} />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-2">
            <AlertTriangle className="h-3.5 w-3.5 text-error" />
            Atrasadas
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-error">
            {split.atrasadas.length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-2">
            <CalendarClock className="h-3.5 w-3.5" />
            Hoje
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {split.hoje.length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-2">
            <CalendarClock className="h-3.5 w-3.5" />A vencer
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {split.aVencer.length}
          </p>
        </div>
      </div>

      {scope === "all" ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <DueActivityList
            title="Clientes"
            cards={clientes}
            today={today}
            empty="Nenhum prazo de cliente atrasado ou a vencer."
          />
          <DueActivityList
            title="Land Grow (internas)"
            cards={internas}
            today={today}
            empty="Nenhuma atividade interna atrasada ou a vencer."
          />
        </div>
      ) : (
        <DueActivityList
          title={scope === "interna" ? "Land Grow" : "Clientes"}
          cards={filtered}
          today={today}
          empty={
            scope === "interna"
              ? "Nenhuma atividade interna atrasada ou a vencer."
              : "Nenhum prazo de cliente atrasado ou a vencer."
          }
        />
      )}
    </div>
  );
}

export function OpsDueBoard({
  scope,
}: {
  scope: "all" | "interna" | "clientes";
}): JSX.Element {
  const feed = useDueFeed();
  return (
    <DueBoardBody
      scope={scope}
      cards={feed.cards}
      today={feed.today}
      loading={feed.loading}
      error={feed.error}
      live={feed.live}
      horizonDays={feed.horizonDays}
    />
  );
}
