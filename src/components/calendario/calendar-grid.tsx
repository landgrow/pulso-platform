"use client";

import { cn } from "@/lib/utils";
import {
  civilDateInSaoPaulo,
  dayNumber,
  hourLabel,
  minutesFromMidnight,
  monthCells,
  startOfMonth,
  weekdayShort,
} from "@/lib/calendario/range";
import type { CalendarEvent } from "@/types/calendar";

export const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function eventTone(event: CalendarEvent): string {
  if (event.source === "holiday") {
    return "border-border bg-surface-2 text-text-2";
  }
  return "text-text-1";
}

export function eventChipStyle(event: CalendarEvent): {
  borderColor: string;
  backgroundColor: string;
} {
  return {
    borderColor: event.color,
    backgroundColor: `${event.color}26`,
  };
}

function layoutTimed(events: CalendarEvent[]): {
  event: CalendarEvent;
  startMin: number;
  endMin: number;
  col: number;
  cols: number;
}[] {
  const items = events
    .filter((event) => !event.allDay)
    .map((event) => {
      const startMin = minutesFromMidnight(event.startsAt);
      const endMin = Math.max(minutesFromMidnight(event.endsAt), startMin + 30);
      return { event, startMin, endMin, col: 0, cols: 1 };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const active: typeof items = [];
  for (const item of items) {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      if ((active[index]?.endMin ?? 0) <= item.startMin)
        active.splice(index, 1);
    }
    const used = new Set(active.map((row) => row.col));
    let col = 0;
    while (used.has(col)) col += 1;
    item.col = col;
    active.push(item);
    const width = Math.max(active.length, ...active.map((row) => row.col + 1));
    for (const row of active) row.cols = Math.max(row.cols, width);
  }
  return items;
}

function clock(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function WeekGrid({
  days,
  today,
  now,
  events,
  onSlot,
  onEvent,
}: {
  days: string[];
  today: string;
  now: Date;
  events: CalendarEvent[];
  onSlot: (date: string, hour: number) => void;
  onEvent: (event: CalendarEvent) => void;
}): JSX.Element {
  const nowDate = civilDateInSaoPaulo(now);
  const nowTop = (hourInNow(now) * 60 + minuteInNow(now)) * (HOUR_HEIGHT / 60);
  const template = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className="grid shrink-0 border-b border-border"
        style={{ gridTemplateColumns: template }}
      >
        <div className="border-r border-border px-1 py-2 text-[10px] text-text-3">
          BRT
        </div>
        {days.map((date) => {
          const isToday = date === today;
          return (
            <div
              key={date}
              className={cn(
                "border-r border-border px-2 py-2 last:border-r-0",
                isToday && "bg-primary/5",
              )}
            >
              <p
                className={cn(
                  "text-[11px] uppercase tracking-wide",
                  isToday ? "font-semibold text-primary" : "text-text-3",
                )}
              >
                {weekdayShort(date)} {dayNumber(date)}
              </p>
            </div>
          );
        })}
      </div>
      <div
        className="grid shrink-0 border-b border-border"
        style={{ gridTemplateColumns: template }}
      >
        <div className="border-r border-border px-1 py-1 text-[10px] text-text-3">
          Dia todo
        </div>
        {days.map((date) => {
          const allDay = events.filter(
            (event) =>
              event.allDay && civilDateInSaoPaulo(event.startsAt) === date,
          );
          return (
            <div
              key={`all-${date}`}
              className="min-h-8 space-y-0.5 border-r border-border px-1 py-1 last:border-r-0"
            >
              {allDay.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEvent(event)}
                  className={cn(
                    "w-full truncate rounded-md border px-1.5 py-0.5 text-left text-[11px]",
                    eventTone(event),
                  )}
                  style={eventChipStyle(event)}
                >
                  {event.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-auto" data-cal-scroll>
        <div className="grid" style={{ gridTemplateColumns: template }}>
          <div className="relative border-r border-border">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative border-t border-border"
                style={{ height: HOUR_HEIGHT }}
              >
                {hour === 0 ? null : (
                  <span className="absolute -top-2 right-1 bg-surface-1 px-0.5 text-[10px] leading-none text-text-3">
                    {hourLabel(hour)}
                  </span>
                )}
              </div>
            ))}
          </div>
          {days.map((date) => {
            const dayEvents = events.filter(
              (event) =>
                !event.allDay && civilDateInSaoPaulo(event.startsAt) === date,
            );
            const laid = layoutTimed(dayEvents);
            return (
              <div
                key={`grid-${date}`}
                className="relative border-r border-border last:border-r-0"
                style={{ height: 24 * HOUR_HEIGHT }}
              >
                {HOURS.map((hour) => (
                  <button
                    key={`${date}-${hour}`}
                    type="button"
                    className="absolute left-0 right-0 border-t border-border hover:bg-surface-2/80"
                    style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => onSlot(date, hour)}
                    aria-label={`${date} ${hourLabel(hour)}`}
                  />
                ))}
                {laid.map((item) => (
                  <button
                    key={item.event.id}
                    type="button"
                    onClick={() => onEvent(item.event)}
                    className={cn(
                      "absolute z-[1] overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] leading-4",
                      eventTone(item.event),
                    )}
                    style={{
                      ...eventChipStyle(item.event),
                      top: (item.startMin / 60) * HOUR_HEIGHT,
                      height:
                        ((item.endMin - item.startMin) / 60) * HOUR_HEIGHT,
                      left: `calc(${(item.col / item.cols) * 100}% + 2px)`,
                      width: `calc(${(1 / item.cols) * 100}% - 4px)`,
                    }}
                  >
                    <span className="block truncate font-medium">
                      {item.event.title}
                    </span>
                    <span className="block truncate text-[10px] opacity-80">
                      {clock(item.event.startsAt)}
                      {item.event.orgName ? ` · ${item.event.orgName}` : ""}
                    </span>
                  </button>
                ))}
                {date === nowDate ? (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-[2] h-px bg-error"
                    style={{ top: nowTop }}
                  >
                    <span className="absolute -left-1 -top-1 size-2 rounded-full bg-error" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function hourInNow(now: Date): number {
  return Number.parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(now),
    10,
  );
}

function minuteInNow(now: Date): number {
  return Number.parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      minute: "2-digit",
    }).format(now),
    10,
  );
}

export function MonthGrid({
  cursor,
  today,
  events,
  onDay,
  onEvent,
}: {
  cursor: string;
  today: string;
  events: CalendarEvent[];
  onDay: (date: string) => void;
  onEvent: (event: CalendarEvent) => void;
}): JSX.Element {
  const cells = monthCells(cursor);
  const month = startOfMonth(cursor).slice(0, 7);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-7 border-b border-border bg-surface-1">
        {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((label) => (
          <p
            key={label}
            className="border-r border-border px-2 py-2 text-center text-[11px] uppercase leading-none text-text-3 last:border-r-0"
          >
            {label}
          </p>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-hidden">
        {cells.map((date) => {
          const dayEvents = events.filter(
            (event) => civilDateInSaoPaulo(event.startsAt) === date,
          );
          const visible = dayEvents.slice(0, 3);
          const extra = dayEvents.length - visible.length;
          const inMonth = date.startsWith(month);
          return (
            <div
              key={date}
              role="button"
              tabIndex={0}
              onClick={() => onDay(date)}
              onKeyDown={(key) => {
                if (key.key === "Enter" || key.key === " ") {
                  key.preventDefault();
                  onDay(date);
                }
              }}
              className={cn(
                "flex min-h-0 flex-col overflow-hidden border-b border-r border-border px-2 pb-1 pt-2 text-left last:border-r-0",
                !inMonth && "bg-surface-2/40",
                date === today && "bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "mb-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs leading-none",
                  date === today
                    ? "bg-primary font-semibold text-primary-foreground"
                    : inMonth
                      ? "text-text-1"
                      : "text-text-3",
                )}
              >
                {dayNumber(date)}
              </span>
              <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
                {visible.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={(click) => {
                      click.stopPropagation();
                      onEvent(event);
                    }}
                    className={cn(
                      "w-full truncate rounded border px-1 py-0.5 text-left text-[10px] leading-4",
                      eventTone(event),
                    )}
                    style={eventChipStyle(event)}
                  >
                    {event.title}
                  </button>
                ))}
                {extra > 0 ? (
                  <p className="px-1 text-[10px] text-text-3">+{extra}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MiniMonth({
  cursor,
  today,
  marked,
  onPick,
}: {
  cursor: string;
  today: string;
  marked: Set<string>;
  onPick: (date: string) => void;
}): JSX.Element {
  const cells = monthCells(cursor);
  const month = startOfMonth(cursor).slice(0, 7);
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 text-center text-[10px] uppercase text-text-3">
        {["do", "2ª", "3ª", "4ª", "5ª", "6ª", "sá"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date) => {
          const inMonth = date.startsWith(month);
          return (
            <button
              key={date}
              type="button"
              onClick={() => onPick(date)}
              className={cn(
                "relative mx-auto flex size-7 items-center justify-center rounded-full text-[11px]",
                date === today &&
                  "bg-primary font-semibold text-primary-foreground",
                date !== today && inMonth && "text-text-1 hover:bg-surface-2",
                date !== today && !inMonth && "text-text-3",
              )}
            >
              {dayNumber(date)}
              {marked.has(date) && date !== today ? (
                <span className="absolute bottom-0.5 size-1 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
