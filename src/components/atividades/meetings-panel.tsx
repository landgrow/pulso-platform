"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  Loader2,
  Mail,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TaskModal } from "@/components/ui/task-modal";
import {
  listMeetings,
  createMeeting,
  deleteMeeting,
  resendMeetingInvites,
  toggleChecklistItem,
  generateCardsFromMeeting,
  type InviteResult,
} from "@/app/actions/meetings";
import { listCardAssignees } from "@/app/actions/boards";
import { MenuSelect } from "@/components/ui/menu-select";
import type { Meeting, MeetingGuest } from "@/types/meetings";
import { cn, formatDate } from "@/lib/utils";

/** Registro de reuniões internas — resumo, tópicos e checklist de atividades, mesmo formato do banco de Reuniões do Notion. */
export function MeetingsPanel({
  orgId,
  hideTitle = false,
}: {
  orgId: string;
  /** Página própria já mostra o título — aqui ficam só as ações. */
  hideTitle?: boolean;
}): JSX.Element {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [novoItem, setNovoItem] = useState<Record<string, string>>({});

  async function refresh(): Promise<void> {
    setLoading(true);
    const result = await listMeetings(orgId);
    if (!result.success) toast.error(result.error);
    else setMeetings(result.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh() sets loading state, needed on every orgId change
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function handleDelete(id: string): Promise<void> {
    const result = await deleteMeeting(id);
    if (!result.success) toast.error(result.error);
    else void refresh();
  }

  async function handleResend(id: string): Promise<void> {
    const result = await resendMeetingInvites(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    reportInvites(result.data);
    void refresh();
  }

  async function handleToggleItem(
    meetingId: string,
    itemId: string,
  ): Promise<void> {
    const result = await toggleChecklistItem({ meetingId, itemId });
    if (!result.success) toast.error(result.error);
    else void refresh();
  }

  async function handleRemoveItem(
    meetingId: string,
    removeId: string,
  ): Promise<void> {
    const result = await toggleChecklistItem({ meetingId, removeId });
    if (!result.success) toast.error(result.error);
    else void refresh();
  }

  async function handleAddItem(meetingId: string): Promise<void> {
    const texto = (novoItem[meetingId] ?? "").trim();
    if (!texto) return;
    setNovoItem((prev) => ({ ...prev, [meetingId]: "" }));
    const result = await toggleChecklistItem({ meetingId, texto });
    if (!result.success) toast.error(result.error);
    else {
      toast.success(
        "Item no checklist. Se for entrega da Land Grow, já virou card.",
      );
      void refresh();
    }
  }

  async function handleGenerateCards(meetingId: string): Promise<void> {
    const result = await generateCardsFromMeeting(meetingId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.data.created > 0
        ? `${result.data.created} card(s) no Plano de Ação.`
        : "Nada novo para gerar (já existia ou não é entrega da Land Grow).",
    );
    void refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-2">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando reuniões...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center",
          hideTitle ? "justify-end" : "justify-between",
        )}
      >
        {hideTitle ? null : (
          <div>
            <h2 className="text-lg font-semibold">Reuniões</h2>
            <p className="text-sm text-text-2">
              Resumo, tópicos e checklist. Item da Land Grow vira tarefa na
              lista.
            </p>
          </div>
        )}
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Nova reunião
        </Button>
      </div>

      {meetings.length === 0 ? (
        <p className="text-sm text-text-2 py-8 text-center">
          Nenhuma reunião registrada ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {meetings.map((m) => {
            const expanded = expandedId === m.id;
            const doneCount = m.checklist.filter((c) => c.done).length;
            return (
              <div
                key={m.id}
                className="rounded-lg border border-border bg-surface-1"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : m.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.titulo}</p>
                    <p className="text-xs text-text-2">
                      {formatDate(m.data)}
                      {m.hora_inicio &&
                        ` · ${m.hora_inicio.slice(0, 5)}–${endTime(m.hora_inicio, m.duracao_min ?? 60)}`}
                      {m.participantes.length > 0 &&
                        ` · ${m.participantes.join(", ")}`}
                      {m.checklist.length > 0 &&
                        ` · ${doneCount}/${m.checklist.length} tarefas`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(m.id);
                    }}
                    className="shrink-0 text-text-2 hover:text-error"
                    aria-label="Excluir reunião"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {m.hora_inicio && (m.convidados ?? []).length > 0 && (
                      <div className="rounded-md bg-surface-2 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-1.5 text-xs font-medium text-text-2">
                            <Mail className="h-3.5 w-3.5" />
                            Convite por e-mail
                            {m.convite_enviado_at
                              ? ` · enviado em ${formatDate(m.convite_enviado_at)}`
                              : " · ainda não enviado"}
                          </p>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => void handleResend(m.id)}
                          >
                            {m.convite_enviado_at
                              ? "Reenviar convite"
                              : "Enviar convite"}
                          </button>
                        </div>
                        <p className="text-sm">
                          {(m.convidados ?? [])
                            .map((g) => g.nome || g.email)
                            .join(", ")}
                        </p>
                        <p className="text-xs text-text-3">
                          Lembrete automático 1 hora antes
                          {m.lembrete_enviado_at ? " (já enviado)" : ""}.
                        </p>
                        {m.link && (
                          <a
                            href={m.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-xs text-primary hover:underline"
                          >
                            {m.link}
                          </a>
                        )}
                      </div>
                    )}
                    {m.resumo && (
                      <div>
                        <p className="text-xs font-medium text-text-2 mb-1">
                          Resumo
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {m.resumo}
                        </p>
                      </div>
                    )}
                    {m.topicos && (
                      <div>
                        <p className="text-xs font-medium text-text-2 mb-1">
                          Tópicos abordados
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {m.topicos}
                        </p>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-xs font-medium text-text-2">
                          Checklist de atividades
                        </p>
                        {m.checklist.length > 0 && (
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => void handleGenerateCards(m.id)}
                          >
                            Gerar tarefas na lista
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {m.checklist.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() =>
                                void handleToggleItem(m.id, item.id)
                              }
                              className="h-4 w-4"
                            />
                            <span
                              className={
                                item.done
                                  ? "line-through text-text-2 flex-1"
                                  : "flex-1"
                              }
                            >
                              {item.texto}
                            </span>
                            <button
                              onClick={() =>
                                void handleRemoveItem(m.id, item.id)
                              }
                              aria-label="Remover"
                            >
                              <X className="h-3.5 w-3.5 text-text-2 hover:text-error" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-1.5">
                          <Input
                            placeholder="+ Item do checklist"
                            className="h-8 text-sm"
                            value={novoItem[m.id] ?? ""}
                            onChange={(e) =>
                              setNovoItem((prev) => ({
                                ...prev,
                                [m.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) =>
                              e.key === "Enter" && void handleAddItem(m.id)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <NewMeetingSheet
        orgId={orgId}
        open={open}
        onOpenChange={setOpen}
        onCreated={() => {
          setOpen(false);
          void refresh();
        }}
      />
    </div>
  );
}

function endTime(start: string, durationMin: number): string {
  const [h = 0, m = 0] = start.split(":").map(Number);
  const total = (h * 60 + m + durationMin) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function reportInvites(r: InviteResult): void {
  if (r.skipped > 0 && r.sent === 0) {
    toast.warning(
      "Reunião salva, mas o e-mail ainda não está configurado: nenhum convite saiu.",
    );
  } else if (r.failed > 0) {
    toast.warning(
      `${r.sent} convite(s) enviado(s), ${r.failed} falharam${r.firstError ? `: ${r.firstError}` : ""}.`,
    );
  } else {
    toast.success(`${r.sent} convite(s) enviado(s) por e-mail.`);
  }
}

function NewMeetingSheet({
  orgId,
  open,
  onOpenChange,
  onCreated,
}: {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}): JSX.Element {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState("");
  const [duracao, setDuracao] = useState("60");
  const [link, setLink] = useState("");
  const [resumo, setResumo] = useState("");
  const [topicos, setTopicos] = useState("");
  const [guests, setGuests] = useState<MeetingGuest[]>([]);
  const [extraEmail, setExtraEmail] = useState("");
  const [enviar, setEnviar] = useState(true);
  const [people, setPeople] = useState<MeetingGuest[]>([]);
  const [saving, setSaving] = useState(false);

  // Quem pode ser convidado: equipe Land Grow + usuários da empresa (com e-mail).
  useEffect(() => {
    if (!open) return;
    void listCardAssignees(orgId).then((result) => {
      if (!result.success) return;
      setPeople(
        result.data
          .filter((a) => a.email)
          .map((a) => ({
            email: (a.email as string).toLowerCase(),
            nome: a.name,
          })),
      );
    });
  }, [open, orgId]);

  function reset(): void {
    setTitulo("");
    setData(new Date().toISOString().slice(0, 10));
    setHora("");
    setDuracao("60");
    setLink("");
    setResumo("");
    setTopicos("");
    setGuests([]);
    setExtraEmail("");
    setEnviar(true);
  }

  function addGuest(guest: MeetingGuest): void {
    setGuests((prev) =>
      prev.some((g) => g.email === guest.email) ? prev : [...prev, guest],
    );
  }

  function addExtra(): void {
    const email = extraEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Digite um e-mail válido.");
      return;
    }
    addGuest({ email, nome: email.split("@")[0] ?? email });
    setExtraEmail("");
  }

  async function handleCreate(): Promise<void> {
    if (!titulo.trim()) return;
    if (guests.length > 0 && !hora) {
      toast.error("Informe o horário para poder enviar o convite.");
      return;
    }
    setSaving(true);
    const result = await createMeeting({
      orgId,
      titulo: titulo.trim(),
      data,
      participantes: guests.map((g) => g.nome || g.email),
      resumo,
      topicos,
      ...(hora
        ? {
            horaInicio: hora,
            duracaoMin: Number(duracao),
            link: link.trim(),
            convidados: guests,
            enviarConvite: enviar,
          }
        : {}),
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (result.data.invites) reportInvites(result.data.invites);
    reset();
    onCreated();
  }

  const available = people.filter(
    (p) => !guests.some((g) => g.email === p.email),
  );
  const canInvite = Boolean(hora) && guests.length > 0;

  return (
    <TaskModal open={open} onClose={() => onOpenChange(false)}>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-6 gap-4">
        <h2 className="font-semibold text-foreground">Nova reunião</h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs text-text-2">Título</p>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Alinhamento semanal"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-xs text-text-2">Data</p>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-text-2">Horário (Brasília)</p>
              <Input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-text-2">Duração</p>
              <MenuSelect
                value={duracao}
                onChange={setDuracao}
                aria-label="Duração"
                options={[
                  { value: "30", label: "30 minutos" },
                  { value: "45", label: "45 minutos" },
                  { value: "60", label: "1 hora" },
                  { value: "90", label: "1 hora e meia" },
                  { value: "120", label: "2 horas" },
                ]}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-text-2">
              Link da reunião (Meet, Zoom...) — opcional
            </p>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-text-2">Participantes</p>
            {guests.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {guests.map((g) => (
                  <span
                    key={g.email}
                    className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-0.5 pl-2.5 pr-1.5 text-xs"
                    title={g.email}
                  >
                    {g.nome || g.email}
                    <button
                      type="button"
                      onClick={() =>
                        setGuests((prev) =>
                          prev.filter((x) => x.email !== g.email),
                        )
                      }
                      aria-label={`Remover ${g.nome || g.email}`}
                      className="text-text-2 hover:text-error"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <MenuSelect
              value=""
              onChange={(email) => {
                const person = people.find((p) => p.email === email);
                if (person) addGuest(person);
              }}
              aria-label="Adicionar participante"
              placeholder={
                available.length > 0
                  ? "+ Adicionar da equipe ou da empresa"
                  : "Todos já adicionados"
              }
              disabled={available.length === 0}
              options={available.map((p) => ({
                value: p.email,
                label: `${p.nome} · ${p.email}`,
              }))}
            />
            <div className="flex gap-1.5">
              <Input
                value={extraEmail}
                onChange={(e) => setExtraEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addExtra();
                  }
                }}
                placeholder="Ou digite o e-mail de outra pessoa"
                className="h-8 text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addExtra}
              >
                Adicionar
              </Button>
            </div>
          </div>

          {canInvite && (
            <label className="flex items-start gap-2 rounded-md bg-surface-2 p-3 text-sm">
              <input
                type="checkbox"
                checked={enviar}
                onChange={(e) => setEnviar(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <CalendarClock className="h-4 w-4" />
                  Enviar convite por e-mail agora
                </span>
                <span className="text-xs text-text-2">
                  Cada participante recebe um convite para a agenda (Google,
                  Outlook ou Apple) e um lembrete automático 1 hora antes.
                </span>
              </span>
            </label>
          )}

          <div className="space-y-1.5">
            <p className="text-xs text-text-2">Resumo</p>
            <Textarea
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-text-2">Tópicos abordados</p>
            <Textarea
              value={topicos}
              onChange={(e) => setTopicos(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <div className="mt-auto">
          <Button
            onClick={() => void handleCreate()}
            disabled={saving || !titulo.trim()}
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : canInvite && enviar ? (
              <Send className="mr-1.5 h-4 w-4" />
            ) : null}
            {canInvite && enviar ? "Criar e enviar convite" : "Criar reunião"}
          </Button>
        </div>
      </div>
    </TaskModal>
  );
}
