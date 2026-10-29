"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listCalendarAgenda } from "@/app/actions/calendar";
import {
  addDaysIso,
  civilDateInSaoPaulo,
  dateInSaoPaulo,
} from "@/lib/notify/calendar";
import type { CalendarEvent } from "@/types/calendar";

function clock(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function SalaHome(): JSX.Element {
  const [name, setName] = useState("equipe");
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [tomorrowEvents, setTomorrowEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const today = dateInSaoPaulo();

  useEffect(() => {
    void (async () => {
      const result = await listCalendarAgenda(today, 2);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setName(result.data.greetingName);
      const tomorrow = addDaysIso(today, 1);
      setTodayEvents(
        result.data.events.filter(
          (event) => civilDateInSaoPaulo(event.startsAt) === today,
        ),
      );
      setTomorrowEvents(
        result.data.events.filter(
          (event) => civilDateInSaoPaulo(event.startsAt) === tomorrow,
        ),
      );
    })();
  }, [today]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h2 className="text-xl font-semibold text-text-1">Bom dia, {name}.</h2>
      <p className="mt-1 text-sm text-text-2">
        Programação de hoje, cruzada com Reuniões e o Calendário da equipe.
      </p>
      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
      <section className="mt-6 rounded-xl border border-border bg-surface-1 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-3">
          Programação · {todayEvents.length} horários
        </p>
        <div className="mt-3 space-y-2">
          {todayEvents.length === 0 ? (
            <p className="text-sm text-text-3">Nada na agenda hoje.</p>
          ) : (
            todayEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-lg border border-border px-3 py-2"
              >
                <p className="text-[11px] text-text-3">
                  {clock(event.startsAt)} – {clock(event.endsAt)}
                  {event.orgName ? ` · ${event.orgName}` : ""}
                </p>
                <p className="text-sm font-medium text-text-1">{event.title}</p>
              </article>
            ))
          )}
        </div>
        {tomorrowEvents.length > 0 ? (
          <p className="mt-4 text-sm text-text-2">
            Amanhã: {tomorrowEvents.map((event) => event.title).join(" · ")}
          </p>
        ) : null}
      </section>
      <p className="mt-4 text-xs text-text-3">
        Agenda completa em{" "}
        <Link href="/admin/calendario" className="text-primary hover:underline">
          Calendário
        </Link>
        . CRM em{" "}
        <Link href="/admin/crm" className="text-primary hover:underline">
          CRM
        </Link>
        .
      </p>
    </div>
  );
}
