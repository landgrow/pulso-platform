"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { listRituals, createRitual, deleteRitual } from "@/app/actions/rituals";
import { RITUAL_LABELS, type Ritual, type RitualTipo } from "@/types/rituals";
import { formatDate } from "@/lib/utils";

/** Registro recorrente de um ritual de gestão (Daily Standup / Weekly Review / Sessão de Resultado). */
export function RitualsPanel({
  orgId,
  tipo,
}: {
  orgId: string;
  tipo: RitualTipo;
}): JSX.Element {
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function refresh(): Promise<void> {
    setLoading(true);
    const result = await listRituals({ orgId, tipo });
    if (!result.success) toast.error(result.error);
    else setRituals(result.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh() sets loading state, needed on every tipo change
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, tipo]);

  async function handleDelete(id: string): Promise<void> {
    const result = await deleteRitual(id);
    if (!result.success) toast.error(result.error);
    else void refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-2">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{RITUAL_LABELS[tipo]}</h2>
          <p className="text-sm text-text-2">
            Histórico de registros deste ritual.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Novo registro
        </Button>
      </div>

      {rituals.length === 0 ? (
        <p className="text-sm text-text-2 py-8 text-center">
          Nenhum registro ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {rituals.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-border bg-surface-1 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{formatDate(r.data)}</p>
                <button
                  onClick={() => void handleDelete(r.id)}
                  className="shrink-0 text-text-2 hover:text-error"
                  aria-label="Excluir registro"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {r.participantes.length > 0 && (
                <p className="text-xs text-text-2 mt-0.5">
                  {r.participantes.join(", ")}
                </p>
              )}
              {r.notas && (
                <p className="text-sm mt-2 whitespace-pre-wrap">{r.notas}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <NewRitualSheet
        orgId={orgId}
        tipo={tipo}
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

function NewRitualSheet({
  orgId,
  tipo,
  open,
  onOpenChange,
  onCreated,
}: {
  orgId: string;
  tipo: RitualTipo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}): JSX.Element {
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [participantesText, setParticipantesText] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  function reset(): void {
    setData(new Date().toISOString().slice(0, 10));
    setParticipantesText("");
    setNotas("");
  }

  async function handleCreate(): Promise<void> {
    setSaving(true);
    const participantes = participantesText
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const result = await createRitual({
      orgId,
      tipo,
      data,
      participantes,
      notas,
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
          <SheetTitle>Novo registro — {RITUAL_LABELS[tipo]}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
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
            <p className="text-xs text-text-2">Notas</p>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={5}
            />
          </div>
        </div>
        <SheetFooter className="p-0 mt-auto">
          <Button onClick={() => void handleCreate()} disabled={saving}>
            Registrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
