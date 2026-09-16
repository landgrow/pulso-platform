"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/page-header";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createWorksmartAction,
  createWorksmartKeyResult,
  createWorksmartObjective,
  deleteWorksmartAction,
  deleteWorksmartKeyResult,
  deleteWorksmartObjective,
  listWorksmartObjectives,
  updateWorksmartKeyResult,
  updateWorksmartObjective,
} from "@/app/actions/worksmart";
import { listTeamMembers, type TeamMember } from "@/app/actions/team";
import { AREA_LABELS, type AreaCanonical } from "@/types";
import {
  WORKSMART_STATUS_LABELS,
  type WorksmartKeyResult,
  type WorksmartObjective,
} from "@/types/worksmart";
import {
  filledSmartCount,
  fiveH2WSummary,
  horizonChip,
  krProgressLabel,
  krProgressPercent,
} from "@/lib/worksmart/cascade";
import { cn } from "@/lib/utils";

const AREAS = Object.entries(AREA_LABELS) as [AreaCanonical, string][];

/** Cascata WorkSmart: objetivo na mão → SMART → key results → card 5H2W. Sem BIN. */
export function WorksmartPanel({
  orgId,
  onOpenBoard,
}: {
  orgId: string;
  onOpenBoard?: ((boardId: string) => void) | undefined;
}): JSX.Element {
  const [objectives, setObjectives] = useState<WorksmartObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newObjectiveOpen, setNewObjectiveOpen] = useState(false);
  const [newKrOpen, setNewKrOpen] = useState(false);
  const [actionKrId, setActionKrId] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);

  async function refresh(): Promise<void> {
    setLoading(true);
    const result = await listWorksmartObjectives(orgId);
    if (!result.success) toast.error(result.error);
    else {
      setObjectives(result.data);
      setSelectedId((current) => {
        if (current && result.data.some((o) => o.id === current))
          return current;
        return result.data[0]?.id ?? null;
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh() sets loading, needed on every orgId change
    void refresh();
    void listTeamMembers().then((result) => {
      if (result.success) setTeam(result.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const selected = objectives.find((o) => o.id === selectedId) ?? null;
  const today = new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-2">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando objetivos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Objetivos WorkSmart</h2>
          <p className="text-sm text-text-2">
            Você escreve o objetivo de maior impacto. Lapida em SMART, define o
            percurso em key results e cada ação vira card 5H2W no Plano de Ação.
          </p>
        </div>
        <Button size="sm" onClick={() => setNewObjectiveOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Novo objetivo
        </Button>
      </div>

      {objectives.length === 0 ? (
        <EmptyState
          title="Nenhum objetivo ainda"
          description="Comece pelo maior impacto desta organização. O BIN entra nesta cascata depois — por enquanto a origem é você."
          action={
            <Button size="sm" onClick={() => setNewObjectiveOpen(true)}>
              Criar objetivo
            </Button>
          }
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {objectives.map((objective) => {
            const on = objective.id === selectedId;
            return (
              <button
                key={objective.id}
                type="button"
                onClick={() => setSelectedId(objective.id)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm max-w-xs",
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface-1 text-text-1 hover:bg-surface-2",
                )}
              >
                <span className="block font-medium truncate">
                  {objective.title}
                </span>
                <span className="block text-[11px] text-text-2 mt-0.5">
                  {WORKSMART_STATUS_LABELS[objective.status]}
                  {objective.setor ? ` · ${objective.setor}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selected ? (
        <ObjectiveDetail
          objective={selected}
          today={today}
          onOpenBoard={onOpenBoard}
          onChanged={() => void refresh()}
          onAddKr={() => setNewKrOpen(true)}
          onAddAction={(krId) => setActionKrId(krId)}
        />
      ) : null}

      <NewObjectiveSheet
        orgId={orgId}
        open={newObjectiveOpen}
        onOpenChange={setNewObjectiveOpen}
        onCreated={(id) => {
          setNewObjectiveOpen(false);
          setSelectedId(id);
          void refresh();
        }}
      />
      {selected ? (
        <NewKrSheet
          objectiveId={selected.id}
          open={newKrOpen}
          onOpenChange={setNewKrOpen}
          onCreated={() => {
            setNewKrOpen(false);
            void refresh();
          }}
        />
      ) : null}
      {actionKrId ? (
        <NewActionSheet
          keyResultId={actionKrId}
          team={team}
          open
          onOpenChange={(open) => {
            if (!open) setActionKrId(null);
          }}
          onCreated={() => {
            setActionKrId(null);
            toast.success("Card 5H2W no Plano de Ação.");
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ObjectiveDetail({
  objective,
  today,
  onOpenBoard,
  onChanged,
  onAddKr,
  onAddAction,
}: {
  objective: WorksmartObjective;
  today: string;
  onOpenBoard?: ((boardId: string) => void) | undefined;
  onChanged: () => void;
  onAddKr: () => void;
  onAddAction: (krId: string) => void;
}): JSX.Element {
  const smart = {
    especifica: objective.smartEspecifica,
    mensuravel: objective.smartMensuravel,
    atingivel: objective.smartAtingivel,
    relevante: objective.smartRelevante,
    temporal: objective.smartTemporal,
  };
  const chip = horizonChip(objective.smartTemporal, today);

  async function saveSmart(patch: {
    status?: "rascunho" | "ativo" | "concluido";
    smartEspecifica?: string | null;
    smartMensuravel?: string | null;
    smartAtingivel?: string | null;
    smartRelevante?: string | null;
    smartTemporal?: string | null;
  }): Promise<void> {
    const result = await updateWorksmartObjective({
      objectiveId: objective.id,
      ...patch,
    });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleDelete(): Promise<void> {
    const result = await deleteWorksmartObjective(objective.id);
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  return (
    <section className="rounded-lg border border-border bg-surface-1 p-4 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {objective.setor ? (
            <p className="text-xs uppercase tracking-wide text-text-2 mb-1">
              {objective.setor}
            </p>
          ) : null}
          <h3 className="text-xl font-semibold tracking-tight">
            {objective.title}
          </h3>
          <p className="text-xs text-text-2 mt-1">
            {filledSmartCount(smart)}/5 SMART ·{" "}
            {WORKSMART_STATUS_LABELS[objective.status]}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {chip ? <Badge variant="outline">{chip}</Badge> : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void saveSmart({
                status:
                  objective.status === "concluido" ? "ativo" : "concluido",
              })
            }
          >
            {objective.status === "concluido" ? "Reabrir" : "Concluir"}
          </Button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="p-1 text-text-2 hover:text-error"
            aria-label="Excluir objetivo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <SmartField
          key={`${objective.id}-especifica`}
          label="Específica"
          value={objective.smartEspecifica ?? ""}
          onSave={(value) => void saveSmart({ smartEspecifica: value })}
        />
        <SmartField
          key={`${objective.id}-mensuravel`}
          label="Mensurável"
          value={objective.smartMensuravel ?? ""}
          onSave={(value) => void saveSmart({ smartMensuravel: value })}
        />
        <SmartField
          key={`${objective.id}-atingivel`}
          label="Atingível"
          value={objective.smartAtingivel ?? ""}
          onSave={(value) => void saveSmart({ smartAtingivel: value })}
        />
        <SmartField
          key={`${objective.id}-relevante`}
          label="Relevante"
          value={objective.smartRelevante ?? ""}
          onSave={(value) => void saveSmart({ smartRelevante: value })}
        />
        <div className="rounded-md border border-border bg-background p-2 space-y-1">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-text-2">
            Temporal
          </dt>
          <dd>
            <Input
              type="date"
              className="h-8 text-sm"
              value={objective.smartTemporal ?? ""}
              onChange={(e) =>
                void saveSmart({ smartTemporal: e.target.value || null })
              }
            />
          </dd>
        </div>
      </dl>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Key results</p>
        <Button size="sm" variant="outline" onClick={onAddKr}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Novo KR
        </Button>
      </div>

      {objective.keyResults.length === 0 ? (
        <p className="text-sm text-text-2">
          Ainda não há percurso. Crie o primeiro key result.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {objective.keyResults.map((kr, index) => (
            <KeyResultCard
              key={kr.id}
              kr={kr}
              index={index + 1}
              onChanged={onChanged}
              onAddAction={() => onAddAction(kr.id)}
              onOpenBoard={onOpenBoard}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SmartField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
}): JSX.Element {
  const [local, setLocal] = useState(value);
  return (
    <div className="rounded-md border border-border bg-background p-2 space-y-1">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-text-2">
        {label}
      </dt>
      <dd>
        <Textarea
          rows={3}
          className="min-h-[4.5rem] text-sm resize-none"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            if (local !== value) onSave(local);
          }}
        />
      </dd>
    </div>
  );
}

function KeyResultCard({
  kr,
  index,
  onChanged,
  onAddAction,
  onOpenBoard,
}: {
  kr: WorksmartKeyResult;
  index: number;
  onChanged: () => void;
  onAddAction: () => void;
  onOpenBoard?: ((boardId: string) => void) | undefined;
}): JSX.Element {
  const doneCards = kr.actions.filter((a) => a.done).length;
  const totalCards = kr.actions.length;
  const pct = krProgressPercent({
    current: kr.currentValue,
    target: kr.targetValue,
    doneCards,
    totalCards,
  });
  const label = krProgressLabel({
    current: kr.currentValue,
    target: kr.targetValue,
    unit: kr.unit,
    doneCards,
    totalCards,
  });
  const [current, setCurrent] = useState(
    kr.currentValue != null ? String(kr.currentValue) : "",
  );
  const incoming = kr.currentValue != null ? String(kr.currentValue) : "";
  const [prevIncoming, setPrevIncoming] = useState(incoming);
  if (incoming !== prevIncoming) {
    setPrevIncoming(incoming);
    setCurrent(incoming);
  }

  async function saveCurrent(): Promise<void> {
    const parsed = current.trim() === "" ? 0 : Number(current);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Número inválido");
      return;
    }
    if (parsed === (kr.currentValue ?? 0)) return;
    const result = await updateWorksmartKeyResult({
      keyResultId: kr.id,
      currentValue: parsed,
    });
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleDelete(): Promise<void> {
    const result = await deleteWorksmartKeyResult(kr.id);
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  return (
    <article className="rounded-lg border border-border bg-background p-3 space-y-3">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">
            KR{index} · {kr.title}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              min={0}
              step="any"
              className="h-7 w-20 text-xs"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              onBlur={() => void saveCurrent()}
              aria-label="Valor atual do key result"
            />
            <span className="text-xs text-text-2">{label}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleDelete()}
          className="p-1 text-text-2 hover:text-error"
          aria-label="Excluir key result"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </header>
      <div
        className="h-1.5 rounded-full bg-surface-2 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={`${Math.round(pct)} por cento`}
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-2">
        {kr.actions.map((action) => (
          <li
            key={action.id}
            className="flex items-start justify-between gap-2 text-sm"
          >
            <div className="min-w-0">
              <p className="font-medium">{action.oQue}</p>
              <p className="text-xs text-text-2">
                {fiveH2WSummary({
                  oQue: action.oQue,
                  quem: action.quemNome,
                  quando: action.quando,
                  onde: action.onde,
                  porQue: action.porQue,
                  como: action.como,
                  quanto: action.quanto,
                }) || "5H2W"}
                {action.columnLabel ? ` · ${action.columnLabel}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {action.boardId && onOpenBoard ? (
                <button
                  type="button"
                  className="text-[11px] text-primary hover:underline"
                  onClick={() => onOpenBoard(action.boardId as string)}
                >
                  kanban
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  void deleteWorksmartAction(action.id).then((result) => {
                    if (!result.success) toast.error(result.error);
                    else onChanged();
                  })
                }
                className="p-1 text-text-2 hover:text-error"
                aria-label="Excluir ação"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={onAddAction}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Card 5H2W
      </Button>
    </article>
  );
}

function NewObjectiveSheet({
  orgId,
  open,
  onOpenChange,
  onCreated,
}: {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}): JSX.Element {
  const [title, setTitle] = useState("");
  const [setor, setSetor] = useState("");
  const [especifica, setEspecifica] = useState("");
  const [mensuravel, setMensuravel] = useState("");
  const [atingivel, setAtingivel] = useState("");
  const [relevante, setRelevante] = useState("");
  const [temporal, setTemporal] = useState("");
  const [saving, setSaving] = useState(false);

  function reset(): void {
    setTitle("");
    setSetor("");
    setEspecifica("");
    setMensuravel("");
    setAtingivel("");
    setRelevante("");
    setTemporal("");
  }

  async function handleCreate(): Promise<void> {
    if (!title.trim()) return;
    setSaving(true);
    const result = await createWorksmartObjective({
      orgId,
      title: title.trim(),
      setor: setor || null,
      smartEspecifica: especifica,
      smartMensuravel: mensuravel,
      smartAtingivel: atingivel,
      smartRelevante: relevante,
      smartTemporal: temporal || null,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    reset();
    onCreated(result.data.id);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="p-0">
          <SheetTitle>Novo objetivo</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <Field label="Objetivo de maior impacto">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Sair da venda no fundador"
            />
          </Field>
          <Field label="Setor (opcional)">
            <Select value={setor} onChange={(e) => setSetor(e.target.value)}>
              <option value="">Sem setor</option>
              {AREAS.map(([key, label]) => (
                <option key={key} value={label}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-xs text-text-2">
            SMART pode ficar para depois — o status vira Ativo quando os cinco
            campos estiverem preenchidos.
          </p>
          <Field label="Específica">
            <Textarea
              rows={2}
              value={especifica}
              onChange={(e) => setEspecifica(e.target.value)}
            />
          </Field>
          <Field label="Mensurável">
            <Textarea
              rows={2}
              value={mensuravel}
              onChange={(e) => setMensuravel(e.target.value)}
            />
          </Field>
          <Field label="Atingível">
            <Textarea
              rows={2}
              value={atingivel}
              onChange={(e) => setAtingivel(e.target.value)}
            />
          </Field>
          <Field label="Relevante">
            <Textarea
              rows={2}
              value={relevante}
              onChange={(e) => setRelevante(e.target.value)}
            />
          </Field>
          <Field label="Temporal">
            <Input
              type="date"
              value={temporal}
              onChange={(e) => setTemporal(e.target.value)}
            />
          </Field>
        </div>
        <SheetFooter className="p-0 mt-auto">
          <Button
            onClick={() => void handleCreate()}
            disabled={saving || !title.trim()}
          >
            Criar objetivo
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function NewKrSheet({
  objectiveId,
  open,
  onOpenChange,
  onCreated,
}: {
  objectiveId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}): JSX.Element {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("%");
  const [saving, setSaving] = useState(false);

  async function handleCreate(): Promise<void> {
    if (!title.trim()) return;
    const targetValue = target.trim() === "" ? null : Number(target);
    if (targetValue != null && !Number.isFinite(targetValue)) {
      toast.error("Meta inválida");
      return;
    }
    setSaving(true);
    const result = await createWorksmartKeyResult({
      objectiveId,
      title: title.trim(),
      targetValue,
      currentValue: 0,
      unit: unit || null,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setTitle("");
    setTarget("");
    setUnit("%");
    onCreated();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="p-0">
          <SheetTitle>Novo key result</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <Field label="Percurso mensurável">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Script em 70% das visitas"
            />
          </Field>
          <Field label="Meta">
            <Input
              type="number"
              min={0}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="70"
            />
          </Field>
          <Field label="Unidade">
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="%, visitas, clientes..."
            />
          </Field>
        </div>
        <SheetFooter className="p-0 mt-auto">
          <Button
            onClick={() => void handleCreate()}
            disabled={saving || !title.trim()}
          >
            Criar key result
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function NewActionSheet({
  keyResultId,
  team,
  open,
  onOpenChange,
  onCreated,
}: {
  keyResultId: string;
  team: TeamMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}): JSX.Element {
  const [oQue, setOQue] = useState("");
  const [quemId, setQuemId] = useState("");
  const [quando, setQuando] = useState("");
  const [onde, setOnde] = useState("");
  const [porQue, setPorQue] = useState("");
  const [como, setComo] = useState("");
  const [quanto, setQuanto] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(): Promise<void> {
    if (!oQue.trim()) return;
    setSaving(true);
    const result = await createWorksmartAction({
      keyResultId,
      oQue: oQue.trim(),
      quemId: quemId || null,
      quando: quando || null,
      onde,
      porQue,
      como,
      quanto,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onCreated();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="p-0">
          <SheetTitle>Card 5H2W</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <Field label="O quê">
            <Input
              value={oQue}
              onChange={(e) => setOQue(e.target.value)}
              placeholder="Menor ação executável"
            />
          </Field>
          <Field label="Quem">
            <Select value={quemId} onChange={(e) => setQuemId(e.target.value)}>
              <option value="">Sem responsável</option>
              {team.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.fullName ?? member.email}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quando">
            <Input
              type="date"
              value={quando}
              onChange={(e) => setQuando(e.target.value)}
            />
          </Field>
          <Field label="Onde">
            <Input value={onde} onChange={(e) => setOnde(e.target.value)} />
          </Field>
          <Field label="Por quê">
            <Textarea
              rows={2}
              value={porQue}
              onChange={(e) => setPorQue(e.target.value)}
            />
          </Field>
          <Field label="Como">
            <Textarea
              rows={2}
              value={como}
              onChange={(e) => setComo(e.target.value)}
            />
          </Field>
          <Field label="Quanto">
            <Input
              value={quanto}
              onChange={(e) => setQuanto(e.target.value)}
              placeholder="Esforço, sessões, valor..."
            />
          </Field>
        </div>
        <SheetFooter className="p-0 mt-auto">
          <Button
            onClick={() => void handleCreate()}
            disabled={saving || !oQue.trim()}
          >
            Criar e mandar ao kanban
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-text-2">{label}</p>
      {children}
    </div>
  );
}
