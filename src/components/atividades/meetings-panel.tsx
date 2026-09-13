"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  listMeetings,
  createMeeting,
  deleteMeeting,
  toggleChecklistItem,
} from "@/app/actions/meetings";
import type { Meeting } from "@/types/meetings";
import { formatDate } from "@/lib/utils";

/** Registro de reuniões internas — resumo, tópicos e checklist de atividades, mesmo formato do banco de Reuniões do Notion. */
export function MeetingsPanel({ orgId }: { orgId: string }): JSX.Element {
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
    else void refresh();
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reuniões</h2>
          <p className="text-sm text-text-2">
            Resumo, tópicos abordados e checklist de atividades.
          </p>
        </div>
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
                      <p className="text-xs font-medium text-text-2 mb-1.5">
                        Checklist de atividades
                      </p>
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
  const [participantesText, setParticipantesText] = useState("");
  const [resumo, setResumo] = useState("");
  const [topicos, setTopicos] = useState("");
  const [saving, setSaving] = useState(false);

  function reset(): void {
    setTitulo("");
    setData(new Date().toISOString().slice(0, 10));
    setParticipantesText("");
    setResumo("");
    setTopicos("");
  }

  async function handleCreate(): Promise<void> {
    if (!titulo.trim()) return;
    setSaving(true);
    const participantes = participantesText
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const result = await createMeeting({
      orgId,
      titulo: titulo.trim(),
      data,
      participantes,
      resumo,
      topicos,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    reset();
    onCreated();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="p-0">
          <SheetTitle>Nova reunião</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs text-text-2">Título</p>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Alinhamento semanal"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-text-2">Data</p>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-text-2">
              Participantes (separados por vírgula)
            </p>
            <Input
              value={participantesText}
              onChange={(e) => setParticipantesText(e.target.value)}
              placeholder="Nayara, Candido..."
            />
          </div>
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
        <SheetFooter className="p-0 mt-auto">
          <Button
            onClick={() => void handleCreate()}
            disabled={saving || !titulo.trim()}
          >
            Criar reunião
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
