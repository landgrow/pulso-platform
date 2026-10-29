"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCalendarBook,
  createCalendarEvent,
  createCalendarType,
  deleteCalendarEvent,
  sendCalendarInviteNow,
  updateCalendarEvent,
} from "@/app/actions/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CALENDAR_COLORS,
  guestFromEmail,
  type CalendarGuest,
} from "@/lib/calendario/model";
import type {
  CalendarBook,
  CalendarClient,
  CalendarEvent,
  CalendarStaff,
  CalendarType,
} from "@/types/calendar";

export interface EventDraft {
  date: string;
  time: string;
  event: CalendarEvent | null;
}

export function EventEditor({
  open,
  draft,
  calendars,
  types,
  staff,
  clients = [],
  forcedOrgId,
  reunioesHref = "/admin/reunioes",
  onOpenChange,
  onSaved,
  onCatalog,
}: {
  open: boolean;
  draft: EventDraft | null;
  calendars: CalendarBook[];
  types: CalendarType[];
  staff: CalendarStaff[];
  clients?: CalendarClient[];
  forcedOrgId?: string;
  reunioesHref?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
  onCatalog: () => Promise<void>;
}): JSX.Element {
  const formKey = draft
    ? `${draft.event?.id ?? "new"}-${draft.date}-${draft.time}`
    : "closed";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && draft ? (
        <EventForm
          key={formKey}
          draft={draft}
          calendars={calendars}
          types={types}
          staff={staff}
          clients={clients}
          {...(forcedOrgId ? { forcedOrgId } : {})}
          reunioesHref={reunioesHref}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
          onCatalog={onCatalog}
        />
      ) : null}
    </Dialog>
  );
}

function EventForm({
  draft,
  calendars,
  types,
  staff,
  clients,
  forcedOrgId,
  reunioesHref,
  onOpenChange,
  onSaved,
  onCatalog,
}: {
  draft: EventDraft;
  calendars: CalendarBook[];
  types: CalendarType[];
  staff: CalendarStaff[];
  clients: CalendarClient[];
  forcedOrgId?: string;
  reunioesHref: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
  onCatalog: () => Promise<void>;
}): JSX.Element {
  const router = useRouter();
  const event = draft.event;
  const editable = !event || event.editable;
  const initialTime = (() => {
    if (event && !event.allDay) {
      return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Sao_Paulo",
      }).format(new Date(event.startsAt));
    }
    return draft.time;
  })();
  const initialDuration = (() => {
    if (!event || event.allDay) return 60;
    const mins = Math.max(
      15,
      Math.round(
        (new Date(event.endsAt).getTime() -
          new Date(event.startsAt).getTime()) /
          60_000,
      ),
    );
    return [15, 30, 60, 90, 120, 180].includes(mins) ? mins : 60;
  })();
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(draft.date);
  const [time, setTime] = useState(initialTime);
  const [durationMin, setDurationMin] = useState(initialDuration);
  const [allDay, setAllDay] = useState(Boolean(event?.allDay));
  const [kind, setKind] = useState(
    event?.kind ?? (forcedOrgId ? "reuniao" : "interno"),
  );
  const [calendarId, setCalendarId] = useState(
    event?.calendarId ??
      calendars.find(
        (item) => item.slug === (forcedOrgId ? "reunioes" : "equipe"),
      )?.id ??
      calendars[0]?.id ??
      "",
  );
  const [orgId, setOrgId] = useState(forcedOrgId ?? event?.orgId ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [link, setLink] = useState(event?.link ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [guests, setGuests] = useState<CalendarGuest[]>(event?.guests ?? []);
  const [guestDraft, setGuestDraft] = useState("");
  const [sendInvite, setSendInvite] = useState(!event);
  const [remind, setRemind] = useState(
    event ? event.remindMinutes != null : true,
  );
  const [postToSala, setPostToSala] = useState(false);
  const [newType, setNewType] = useState("");
  const [newBook, setNewBook] = useState("");
  const [newColor, setNewColor] = useState<string>(CALENDAR_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function addGuest(raw: string, userId?: string): void {
    const built = userId ? guestFromEmail(raw, userId) : guestFromEmail(raw);
    if (!built) {
      setError("E-mail inválido.");
      return;
    }
    setGuests((current) =>
      current.some((item) => item.email === built.email)
        ? current
        : [...current, built],
    );
    setGuestDraft("");
    setError(null);
  }

  async function save(): Promise<void> {
    if (!editable) return;
    setBusy(true);
    const payload: Record<string, unknown> = {
      title,
      date,
      kind,
      allDay,
      durationMin,
      guests,
      sendInvite: sendInvite && guests.length > 0,
      postToSala,
    };
    if (!allDay) payload.time = time;
    if (calendarId) payload.calendarId = calendarId;
    if (location.trim()) payload.location = location.trim();
    if (link.trim()) payload.link = link.trim();
    if (notes.trim()) payload.notes = notes.trim();
    if (remind) payload.remindMinutes = 60;
    else payload.remindMinutes = null;
    if (orgId) payload.orgId = orgId;
    if (event?.id) payload.id = event.id;
    const result = event?.id
      ? await updateCalendarEvent(payload)
      : await createCalendarEvent(payload);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    await onSaved();
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>
          {!event ? "Novo horário" : editable ? "Editar horário" : event.title}
        </DialogTitle>
      </DialogHeader>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <form
        className="space-y-3"
        onSubmit={(submit) => {
          submit.preventDefault();
          void save();
        }}
      >
        <Input
          value={title}
          onChange={(change) => setTitle(change.target.value)}
          placeholder="Título"
          required
          disabled={!editable}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={date}
            onChange={(change) => setDate(change.target.value)}
            required
            disabled={!editable}
          />
          <Input
            type="time"
            value={time}
            onChange={(change) => setTime(change.target.value)}
            required={!allDay}
            disabled={!editable || allDay}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input
            type="checkbox"
            checked={allDay}
            disabled={!editable}
            onChange={(change) => setAllDay(change.target.checked)}
          />
          Dia inteiro
        </label>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-9 rounded-md border border-border bg-surface-1 px-2 text-sm"
            value={durationMin}
            disabled={!editable || allDay}
            onChange={(change) => setDurationMin(Number(change.target.value))}
          >
            {[15, 30, 60, 90, 120, 180, 240, 360].map((mins) => (
              <option key={mins} value={mins}>
                {mins} min
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-surface-1 px-2 text-sm"
            value={kind}
            disabled={!editable}
            onChange={(change) => setKind(change.target.value)}
          >
            {types.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        {clients.length > 0 && !forcedOrgId ? (
          <select
            className="h-9 w-full rounded-md border border-border bg-surface-1 px-2 text-sm"
            value={orgId}
            disabled={!editable}
            onChange={(change) => {
              const next = change.target.value;
              setOrgId(next);
              if (!next) return;
              setKind((current) =>
                current === "interno" || current === "lembrete"
                  ? "reuniao"
                  : current,
              );
              const reunioes = calendars.find(
                (item) => item.slug === "reunioes",
              );
              if (reunioes) setCalendarId(reunioes.id);
            }}
          >
            <option value="">Cliente da base…</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        ) : null}
        {editable && !forcedOrgId ? (
          <div className="flex gap-2">
            <Input
              value={newType}
              onChange={(change) => setNewType(change.target.value)}
              placeholder="Novo tipo (ex: Call comercial)"
            />
            <Button
              type="button"
              variant="outline"
              disabled={newType.trim().length < 2}
              onClick={() => {
                void (async () => {
                  const result = await createCalendarType(newType);
                  if (!result.success) {
                    setError(result.error);
                    return;
                  }
                  setKind(result.data.slug);
                  setNewType("");
                  await onCatalog();
                })();
              }}
            >
              + tipo
            </Button>
          </div>
        ) : null}
        <select
          className="h-9 w-full rounded-md border border-border bg-surface-1 px-2 text-sm"
          value={calendarId}
          disabled={!editable}
          onChange={(change) => setCalendarId(change.target.value)}
        >
          {calendars
            .filter(
              (item) =>
                item.sourceKey !== "holidays" && item.sourceKey !== "meetings",
            )
            .concat(calendars.filter((item) => item.sourceKey === "meetings"))
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
        {editable && !forcedOrgId ? (
          <div className="space-y-2 rounded-lg border border-border p-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
              Nova agenda
            </p>
            <div className="flex flex-wrap gap-1">
              {CALENDAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  onClick={() => setNewColor(color)}
                  className="size-5 rounded-full border border-border"
                  style={{
                    backgroundColor: color,
                    outline:
                      newColor === color ? "2px solid currentColor" : undefined,
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newBook}
                onChange={(change) => setNewBook(change.target.value)}
                placeholder="Nome da agenda"
              />
              <Button
                type="button"
                variant="outline"
                disabled={newBook.trim().length < 2}
                onClick={() => {
                  void (async () => {
                    const result = await createCalendarBook({
                      name: newBook,
                      color: newColor,
                    });
                    if (!result.success) {
                      setError(result.error);
                      return;
                    }
                    setCalendarId(result.data.id);
                    setNewBook("");
                    await onCatalog();
                  })();
                }}
              >
                + agenda
              </Button>
            </div>
          </div>
        ) : null}
        <Input
          value={location}
          onChange={(change) => setLocation(change.target.value)}
          placeholder="Endereço ou local"
          disabled={!editable}
        />
        <Input
          value={link}
          onChange={(change) => setLink(change.target.value)}
          placeholder="Link (Meet, Zoom, Sala)"
          disabled={!editable}
        />
        <Textarea
          value={notes}
          onChange={(change) => setNotes(change.target.value)}
          placeholder="Observações"
          rows={4}
          disabled={!editable}
        />
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
            Convidados
          </p>
          <div className="flex flex-wrap gap-1">
            {guests.map((guest) => (
              <button
                key={guest.email}
                type="button"
                disabled={!editable}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-2"
                onClick={() =>
                  setGuests((current) =>
                    current.filter((item) => item.email !== guest.email),
                  )
                }
              >
                {guest.name} · {guest.email} ×
              </button>
            ))}
          </div>
          {editable ? (
            <>
              <div className="flex gap-2">
                <Input
                  value={guestDraft}
                  onChange={(change) => setGuestDraft(change.target.value)}
                  placeholder="e-mail do convidado"
                  onKeyDown={(key) => {
                    if (key.key === "Enter") {
                      key.preventDefault();
                      addGuest(guestDraft);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addGuest(guestDraft)}
                >
                  Adicionar
                </Button>
              </div>
              {staff.length > 0 ? (
                <select
                  className="h-9 w-full rounded-md border border-border bg-surface-1 px-2 text-sm"
                  defaultValue=""
                  onChange={(change) => {
                    const member = staff.find(
                      (item) => item.userId === change.target.value,
                    );
                    if (!member) return;
                    addGuest(member.email, member.userId);
                    change.target.value = "";
                  }}
                >
                  <option value="">Equipe interna…</option>
                  {staff.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name} · {member.email}
                    </option>
                  ))}
                </select>
              ) : null}
            </>
          ) : null}
        </div>
        {editable ? (
          <>
            <label className="flex items-center gap-2 text-sm text-text-2">
              <input
                type="checkbox"
                checked={sendInvite}
                onChange={(change) => setSendInvite(change.target.checked)}
              />
              Enviar convite por e-mail (.ics)
            </label>
            <label className="flex items-center gap-2 text-sm text-text-2">
              <input
                type="checkbox"
                checked={remind}
                onChange={(change) => setRemind(change.target.checked)}
              />
              Lembrete por e-mail na manhã do dia
            </label>
            {forcedOrgId ? null : (
              <label className="flex items-center gap-2 text-sm text-text-2">
                <input
                  type="checkbox"
                  checked={postToSala}
                  onChange={(change) => setPostToSala(change.target.checked)}
                />
                Avisar no #geral
              </label>
            )}
          </>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {editable ? (
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? "Salvando…" : event ? "Salvar" : "Agendar"}
            </Button>
          ) : null}
          {event?.editable ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void (async () => {
                    const result = await sendCalendarInviteNow(event.id, false);
                    setError(
                      result.success
                        ? `Convite enviado (${result.data.sent}).`
                        : result.error,
                    );
                  })();
                }}
              >
                Enviar convite
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void (async () => {
                    const result = await sendCalendarInviteNow(event.id, true);
                    setError(
                      result.success
                        ? `Lembrete enviado (${result.data.sent}).`
                        : result.error,
                    );
                  })();
                }}
              >
                Lembrar agora
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void (async () => {
                    const result = await deleteCalendarEvent(event.id);
                    if (!result.success) {
                      setError(result.error);
                      return;
                    }
                    onOpenChange(false);
                    await onSaved();
                  })();
                }}
              >
                Apagar
              </Button>
            </>
          ) : null}
          {event?.meetingId || event?.source === "meeting" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(reunioesHref)}
            >
              Abrir em Reuniões
            </Button>
          ) : null}
        </div>
      </form>
    </DialogContent>
  );
}
