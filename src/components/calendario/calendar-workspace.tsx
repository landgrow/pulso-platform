"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import {
  createCalendarBook,
  deleteCalendarBook,
  listCalendarAgenda,
} from "@/app/actions/calendar";
import {
  HOUR_HEIGHT,
  MiniMonth,
  MonthGrid,
  WeekGrid,
} from "@/components/calendario/calendar-grid";
import {
  EventEditor,
  type EventDraft,
} from "@/components/calendario/event-editor";
import { CollapsibleSubnav } from "@/components/layout/nav-collapse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { holidaysBetween } from "@/lib/calendario/holidays-br";
import { CALENDAR_COLORS } from "@/lib/calendario/model";
import {
  addDaysIso,
  addMonthsIso,
  civilDateInSaoPaulo,
  monthGridStart,
  monthTitle,
  padClock,
  startOfMonth,
  startOfWeekSunday,
  weekDays,
} from "@/lib/calendario/range";
import { dateInSaoPaulo } from "@/lib/notify/calendar";
import { cn } from "@/lib/utils";
import type {
  CalendarBook,
  CalendarClient,
  CalendarEvent,
  CalendarStaff,
  CalendarType,
} from "@/types/calendar";

type CalView = "semana" | "mes" | "dia";
const HIDDEN_KEY = "pulso.cal.hidden";

function holidayEvents(
  from: string,
  to: string,
  book: CalendarBook | null,
): CalendarEvent[] {
  return holidaysBetween(from, to).map((row) => ({
    id: `holiday:${row.date}`,
    title: row.title,
    startsAt: `${row.date}T00:00:00-03:00`,
    endsAt: `${row.date}T23:59:59-03:00`,
    kind: "lembrete",
    calendarId: book?.id ?? null,
    calendarSlug: "feriados",
    color: book?.color ?? "#b45309",
    orgId: null,
    orgName: null,
    meetingId: null,
    channelId: null,
    link: null,
    notes: "Feriado nacional",
    location: null,
    guests: [],
    remindMinutes: null,
    source: "holiday",
    allDay: true,
    editable: false,
  }));
}

function readHidden(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

export function CalendarWorkspace({
  orgId,
  reunioesHref = "/admin/reunioes",
}: {
  orgId?: string;
  reunioesHref?: string;
} = {}): JSX.Element {
  const today = dateInSaoPaulo();
  const [cursor, setCursor] = useState(today);
  const [view, setView] = useState<CalView>("semana");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<CalendarBook[]>([]);
  const [types, setTypes] = useState<CalendarType[]>([]);
  const [staff, setStaff] = useState<CalendarStaff[]>([]);
  const [clients, setClients] = useState<CalendarClient[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(readHidden);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [newBook, setNewBook] = useState("");
  const [newColor, setNewColor] = useState<string>(CALENDAR_COLORS[0]);
  const scrollerReady = useRef(false);

  const weekStart = startOfWeekSunday(cursor);
  const rangeFrom =
    view === "mes"
      ? monthGridStart(cursor)
      : view === "dia"
        ? cursor
        : weekStart;
  const rangeDays = view === "mes" ? 41 : view === "dia" ? 0 : 6;
  const rangeTo = addDaysIso(rangeFrom, rangeDays);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  async function refresh(): Promise<void> {
    const result = await listCalendarAgenda(rangeFrom, rangeDays + 1, orgId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setError(null);
    setEvents(result.data.events);
    setCalendars(result.data.calendars);
    setTypes(result.data.types);
    setStaff(result.data.staff);
    setClients(result.data.clients);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listCalendarAgenda(rangeFrom, rangeDays + 1, orgId);
      if (cancelled) return;
      if (!result.success) {
        setError(result.error);
        return;
      }
      setError(null);
      setEvents(result.data.events);
      setCalendars(result.data.calendars);
      setTypes(result.data.types);
      setStaff(result.data.staff);
      setClients(result.data.clients);
    })();
    return () => {
      cancelled = true;
    };
  }, [rangeFrom, rangeDays, orgId]);

  function toggleBook(slug: string): void {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      window.localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  const feriados = calendars.find((item) => item.slug === "feriados") ?? null;

  const merged = useMemo(() => {
    const holidays = hidden.has("feriados")
      ? []
      : holidayEvents(rangeFrom, rangeTo, feriados);
    return [...events, ...holidays].filter((event) => {
      const slug = event.calendarSlug ?? "equipe";
      return !hidden.has(slug);
    });
  }, [events, feriados, hidden, rangeFrom, rangeTo]);

  const visible =
    query.trim().length < 2
      ? merged
      : merged.filter((event) =>
          event.title.toLowerCase().includes(query.trim().toLowerCase()),
        );

  const marked = useMemo(() => {
    const set = new Set<string>();
    for (const event of merged) set.add(civilDateInSaoPaulo(event.startsAt));
    return set;
  }, [merged]);

  function openSlot(nextDate: string, hour: number): void {
    setDraft({ date: nextDate, time: padClock(hour), event: null });
  }

  function openEvent(event: CalendarEvent): void {
    setDraft({
      date: civilDateInSaoPaulo(event.startsAt),
      time: padClock(9),
      event,
    });
  }

  const heading = monthTitle(cursor);

  return (
    <div className="-mx-5 -my-5 flex h-[calc(100dvh-3.5rem)] min-h-[28rem] overflow-hidden border-y border-border bg-surface-1 md:-mx-8">
      <CollapsibleSubnav storageKey="pulso-nav-calendario">
        <aside className="flex h-full min-h-0 flex-col overflow-y-auto border-r border-border bg-surface-2">
          <div className="border-b border-border px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-3">
              Calendário
            </p>
            <p className="mt-1 text-sm font-semibold capitalize text-text-1">
              {heading}
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3 w-full"
              onClick={() => openSlot(cursor, 9)}
            >
              <Plus className="size-3.5" />
              Horário
            </Button>
          </div>
          <div className="border-b border-border px-3 py-3">
            <MiniMonth
              cursor={cursor}
              today={today}
              marked={marked}
              onPick={(next) => {
                setCursor(next);
                if (view === "mes") setView("semana");
              }}
            />
          </div>
          <div className="space-y-2 px-3 py-3 text-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-3">
              Agendas
            </p>
            {calendars.map((book) => (
              <div
                key={book.id}
                className="flex items-center gap-2 text-text-1"
              >
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!hidden.has(book.slug)}
                    onChange={() => toggleBook(book.slug)}
                  />
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: book.color }}
                  />
                  <span className="min-w-0 truncate">{book.name}</span>
                </label>
                {!book.isSystem && !orgId ? (
                  <button
                    type="button"
                    className="text-[10px] text-text-3 hover:text-error"
                    onClick={() => {
                      void (async () => {
                        const result = await deleteCalendarBook(book.id);
                        if (!result.success) setError(result.error);
                        else await refresh();
                      })();
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
            {orgId ? null : (
              <>
                <div className="flex flex-wrap gap-1 pt-1">
                  {CALENDAR_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={color}
                      onClick={() => setNewColor(color)}
                      className="size-4 rounded-full border border-border"
                      style={{
                        backgroundColor: color,
                        outline:
                          newColor === color
                            ? "2px solid currentColor"
                            : undefined,
                      }}
                    />
                  ))}
                </div>
                <form
                  className="flex gap-1"
                  onSubmit={(submit) => {
                    submit.preventDefault();
                    void (async () => {
                      const result = await createCalendarBook({
                        name: newBook,
                        color: newColor,
                      });
                      if (!result.success) {
                        setError(result.error);
                        return;
                      }
                      setNewBook("");
                      await refresh();
                    })();
                  }}
                >
                  <Input
                    value={newBook}
                    onChange={(change) => setNewBook(change.target.value)}
                    placeholder="Nova agenda"
                    className="h-8 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={newBook.trim().length < 2}
                  >
                    +
                  </Button>
                </form>
              </>
            )}
          </div>
        </aside>
      </CollapsibleSubnav>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <h1 className="mr-auto text-lg font-semibold capitalize text-text-1">
            {heading}
          </h1>
          <div className="flex rounded-md border border-border">
            {(["semana", "mes", "dia"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={cn(
                  "px-2.5 py-1 text-xs capitalize",
                  view === item
                    ? "bg-primary text-primary-foreground"
                    : "text-text-2 hover:bg-surface-2",
                )}
              >
                {item === "mes" ? "mês" : item}
              </button>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setCursor(today)}
          >
            Hoje
          </Button>
          <button
            type="button"
            className="rounded-md p-1 text-text-2 hover:bg-surface-2"
            onClick={() =>
              setCursor(
                view === "mes"
                  ? addMonthsIso(startOfMonth(cursor), -1)
                  : addDaysIso(cursor, view === "dia" ? -1 : -7),
              )
            }
            aria-label="Anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-text-2 hover:bg-surface-2"
            onClick={() =>
              setCursor(
                view === "mes"
                  ? addMonthsIso(startOfMonth(cursor), 1)
                  : addDaysIso(cursor, view === "dia" ? 1 : 7),
              )
            }
            aria-label="Próximo"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 size-3.5 text-text-3" />
            <Input
              value={query}
              onChange={(change) => setQuery(change.target.value)}
              placeholder="Buscar eventos"
              className="h-8 w-44 bg-surface-1 pl-7 text-xs"
            />
            {query.trim().length >= 2 ? (
              <div className="absolute right-0 z-10 mt-1 w-64 rounded-md border border-border bg-surface-1 p-1 shadow-md">
                {visible.slice(0, 8).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="block w-full truncate rounded px-2 py-1.5 text-left text-xs hover:bg-surface-2"
                    onClick={() => {
                      setCursor(civilDateInSaoPaulo(event.startsAt));
                      setQuery("");
                      openEvent(event);
                    }}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </header>
        {error ? (
          <p className="border-b border-error/30 bg-error/10 px-4 py-2 text-xs text-error">
            {error}
          </p>
        ) : null}
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          ref={(node) => {
            if (!node || scrollerReady.current) return;
            const scroller = node.querySelector("[data-cal-scroll]");
            if (scroller instanceof HTMLElement) {
              scroller.scrollTop = Math.max(
                0,
                (hourInSaoPauloNow(now) - 1) * HOUR_HEIGHT,
              );
              scrollerReady.current = true;
            }
          }}
        >
          {view === "mes" ? (
            <MonthGrid
              cursor={cursor}
              today={today}
              events={visible}
              onDay={(next) => openSlot(next, 9)}
              onEvent={openEvent}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col" data-cal-scroll>
              <WeekGrid
                days={view === "dia" ? [cursor] : weekDays(weekStart)}
                today={today}
                now={now}
                events={visible}
                onSlot={openSlot}
                onEvent={openEvent}
              />
            </div>
          )}
        </div>
      </section>

      <EventEditor
        open={draft !== null}
        draft={draft}
        calendars={calendars}
        types={types}
        staff={staff}
        clients={clients}
        {...(orgId ? { forcedOrgId: orgId } : {})}
        reunioesHref={reunioesHref}
        onOpenChange={(next) => {
          if (!next) setDraft(null);
        }}
        onSaved={refresh}
        onCatalog={refresh}
      />
    </div>
  );
}

function hourInSaoPauloNow(now: Date): number {
  return Number.parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(now),
    10,
  );
}
