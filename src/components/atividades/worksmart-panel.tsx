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
import { TaskModal } from "@/components/ui/task-modal";
import {
  createWorksmartAction,
  createWorksmartKeyResult,
  createWorksmartObjective,
  deleteWorksmartAction,
  deleteWorksmartKeyResult,
  deleteWorksmartObjective,
  generateWorksmartCascade,
  listWorksmartObjectives,
  updateWorksmartKeyResult,
  updateWorksmartObjective,
} from "@/app/actions/worksmart";
import { exportWorksmartPdf } from "@/app/actions/reports";
import { listTeamMembers, type TeamMember } from "@/app/actions/team";
import { PdfExportButton } from "@/components/reports/pdf-export-button";
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
  isObjectiveAchieved,
  isSmartComplete,
  krProgressLabel,
  krProgressPercent,
  objectiveProgressPercent,
} from "@/lib/worksmart/cascade";
import { cn } from "@/lib/utils";

const AREAS = Object.entries(AREA_LABELS) as [AreaCanonical, string][];

const OBJECTIVE_EXAMPLES = {
  title: "Ex.: Sair da venda no fundador — o resultado que muda o jogo.",
  setor: "Ex.: Comercial. Só preencha se o objetivo puxa um setor.",
  especifica:
    "Ex.: O closer conduz a visita; o fundador não entra mais na reunião de venda.",
  mensuravel: "Ex.: 70% das visitas qualificadas sem o fundador.",
  atingivel: "Ex.: Script pronto e closer no time; dá para fazer em 90 dias.",
  relevante:
    "Ex.: Sem isso a empresa não escala — o gargalo é o fundador na venda.",
  temporal: "Ex.: data de corte, tipo 18/12/2026.",
} as const;

function ObjectiveChipList({
  objectives,
  selectedId,
  onSelect,
}: {
  objectives: WorksmartObjective[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}): JSX.Element {
  const open = objectives.filter((o) => !isObjectiveAchieved(o));
  const won = objectives.filter((o) => isObjectiveAchieved(o));

  function chips(items: WorksmartObjective[], wonStyle: boolean): JSX.Element {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((objective) => {
          const on = objective.id === selectedId;
          return (
            <button
              key={objective.id}
              type="button"
              onClick={() => onSelect(objective.id)}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-sm max-w-xs",
                on
                  ? "border-primary bg-primary/10 text-primary"
                  : wonStyle
                    ? "border-success/40 bg-success/10 text-text-1 hover:bg-success/15"
                    : "border-border bg-surface-1 text-text-1 hover:bg-surface-2",
              )}
            >
              <span className="block font-medium truncate">
                {objective.title}
              </span>
              <span className="block text-[11px] text-text-2 mt-0.5">
                {wonStyle
                  ? "Resultado"
                  : WORKSMART_STATUS_LABELS[objective.status]}
                {objective.orgName ? ` · ${objective.orgName}` : ""}
                {objective.setor ? ` · ${objective.setor}` : ""}
                {objective.keyResults.length > 0
                  ? ` · ${Math.round(objectiveProgressPercent(objective.keyResults))}%`
                  : ""}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {open.length > 0 ? chips(open, false) : null}
      {won.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-2">
            Resultados
          </p>
          {chips(won, true)}
        </div>
      ) : null}
    </div>
  );
}

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
            SMART completo gera o key result, a métrica e os cards 5H2W no Plano
            de Ação. Acompanhe atual versus meta aqui; o andamento segue no
            kanban.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PdfExportButton
            label="Exportar PDF"
            run={() => exportWorksmartPdf(orgId)}
          />
          <Button size="sm" onClick={() => setNewObjectiveOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo objetivo
          </Button>
        </div>
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
        <ObjectiveChipList
          objectives={objectives}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}

      {selected ? (
        <ObjectiveDetail
          objective={selected}
          team={team}
          today={today}
          onOpenBoard={onOpenBoard}
          onChanged={() => void refresh()}
          onAddKr={() => setNewKrOpen(true)}
          onAddAction={(krId) => setActionKrId(krId)}
        />
      ) : null}

      <NewObjectiveSheet
        orgId={orgId}
        team={team}
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
  team,
  today,
  onOpenBoard,
  onChanged,
  onAddKr,
  onAddAction,
}: {
  objective: WorksmartObjective;
  team: TeamMember[];
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
  const smartReady = isSmartComplete(smart);
  const missingActions = objective.keyResults.some(
    (kr) => kr.actions.length === 0,
  );
  const needsCascade =
    smartReady && (objective.keyResults.length === 0 || missingActions);
  const progress = objectiveProgressPercent(objective.keyResults);
  const [generating, setGenerating] = useState(false);
  const [quemId, setQuemId] = useState("");

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
    else {
      if (patch.status === "concluido") {
        toast.success(
          "Resultado registrado. Aparece em Objetivos e no Dashboard.",
        );
      }
      onChanged();
    }
  }

  async function handleDelete(): Promise<void> {
    const result = await deleteWorksmartObjective(objective.id);
    if (!result.success) toast.error(result.error);
    else onChanged();
  }

  async function handleGenerate(): Promise<void> {
    setGenerating(true);
    const result = await generateWorksmartCascade({
      objectiveId: objective.id,
      quemId: quemId || null,
    });
    setGenerating(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (result.data.keyResults === 0 && result.data.cards === 0) {
      toast.message("Este objetivo já tem percurso e cards no kanban.");
    } else {
      toast.success(
        `Percurso gerado: ${result.data.keyResults} key result, ${result.data.cards} cards no Plano de Ação.`,
      );
    }
    onChanged();
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
            {objective.keyResults.length > 0
              ? ` · ${Math.round(progress)}% do percurso`
              : ""}
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

      {objective.keyResults.length > 0 ? (
        <div
          className="h-1.5 rounded-full bg-surface-2 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label={`${Math.round(progress)} por cento do objetivo`}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <SmartField
          key={`${objective.id}-especifica`}
          label="Específica"
          value={objective.smartEspecifica ?? ""}
          example={OBJECTIVE_EXAMPLES.especifica}
          onSave={(value) => void saveSmart({ smartEspecifica: value })}
        />
        <SmartField
          key={`${objective.id}-mensuravel`}
          label="Mensurável"
          value={objective.smartMensuravel ?? ""}
          example={OBJECTIVE_EXAMPLES.mensuravel}
          onSave={(value) => void saveSmart({ smartMensuravel: value })}
        />
        <SmartField
          key={`${objective.id}-atingivel`}
          label="Atingível"
          value={objective.smartAtingivel ?? ""}
          example={OBJECTIVE_EXAMPLES.atingivel}
          onSave={(value) => void saveSmart({ smartAtingivel: value })}
        />
        <SmartField
          key={`${objective.id}-relevante`}
          label="Relevante"
          value={objective.smartRelevante ?? ""}
          example={OBJECTIVE_EXAMPLES.relevante}
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
          <p className="text-[11px] leading-snug text-text-2">
            {OBJECTIVE_EXAMPLES.temporal}
          </p>
        </div>
      </dl>

      {needsCascade ? (
        <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
          <p className="text-sm text-text-1">
            {objective.keyResults.length === 0
              ? "O SMART está pronto. Isso vira key result com métrica e cards 5H2W no Plano de Ação."
              : "Há key result sem cards. Gera as atividades no kanban a partir do SMART."}
          </p>
          <div className="max-w-xs space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-text-2">
              Responsável dos cards
            </p>
            <Select value={quemId} onChange={(e) => setQuemId(e.target.value)}>
              <option value="">Eu — quem está gerando</option>
              {team.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.fullName ?? member.email}
                </option>
              ))}
            </Select>
          </div>
          <Button
            size="sm"
            onClick={() => void handleGenerate()}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5 mr-1.5" />
            )}
            Gerar percurso e cards no kanban
          </Button>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Key results</p>
        <Button size="sm" variant="outline" onClick={onAddKr}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Novo KR
        </Button>
      </div>

      {objective.keyResults.length === 0 && !needsCascade ? (
        <p className="text-sm text-text-2">
          Complete os cinco campos SMART para gerar o percurso, ou crie o
          primeiro key result à mão.
        </p>
      ) : objective.keyResults.length === 0 ? null : (
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
  example,
  onSave,
}: {
  label: string;
  value: string;
  example: string;
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
      <p className="text-[11px] leading-snug text-text-2">{example}</p>
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
          <div className="grid grid-cols-2 gap-2 mt-2">
            <label className="space-y-1">
              <span className="block text-[11px] uppercase tracking-wide text-text-2">
                Atual
              </span>
              <Input
                type="number"
                min={0}
                step="any"
                className="h-8 text-sm"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                onBlur={() => void saveCurrent()}
                aria-label="Valor atual do key result"
              />
            </label>
            <div className="space-y-1">
              <span className="block text-[11px] uppercase tracking-wide text-text-2">
                Meta
              </span>
              <p className="h-8 flex items-center text-sm font-medium">
                {kr.targetValue != null
                  ? `${kr.targetValue}${kr.unit ? ` ${kr.unit}` : ""}`
                  : "sem número"}
              </p>
            </div>
          </div>
          <p className="text-xs text-text-2 mt-1">
            {kr.targetValue != null
              ? `Acompanhe ${label}. Os cards no kanban mostram o que está em execução.`
              : `${doneCards}/${totalCards} cards no kanban. Sem meta numérica — o progresso vem das atividades.`}
          </p>
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
  team,
  open,
  onOpenChange,
  onCreated,
}: {
  orgId: string;
  team: TeamMember[];
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
  const [quemId, setQuemId] = useState("");
  const [saving, setSaving] = useState(false);

  function reset(): void {
    setTitle("");
    setSetor("");
    setEspecifica("");
    setMensuravel("");
    setAtingivel("");
    setRelevante("");
    setTemporal("");
    setQuemId("");
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
      quemId: quemId || null,
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
    <TaskModal open={open} onClose={() => onOpenChange(false)}>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-6 gap-4">
        <div className="p-0">
          <h2 className="font-semibold text-foreground">Novo objetivo</h2>
        </div>
        <div className="space-y-4">
          <Field
            label="Objetivo de maior impacto"
            example={OBJECTIVE_EXAMPLES.title}
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Sair da venda no fundador"
            />
          </Field>
          <Field label="Setor (opcional)" example={OBJECTIVE_EXAMPLES.setor}>
            <Select value={setor} onChange={(e) => setSetor(e.target.value)}>
              <option value="">Sem setor</option>
              {AREAS.map(([key, label]) => (
                <option key={key} value={label}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Responsável dos cards"
            example="Ex.: quem leva o percurso no Plano de Ação. Vazio = você."
          >
            <Select value={quemId} onChange={(e) => setQuemId(e.target.value)}>
              <option value="">Eu — quem está criando</option>
              {team.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.fullName ?? member.email}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-xs text-text-2">
            SMART pode ficar para depois — o status vira Ativo quando os cinco
            campos estiverem preenchidos.
          </p>
          <Field label="Específica" example={OBJECTIVE_EXAMPLES.especifica}>
            <Textarea
              rows={2}
              value={especifica}
              onChange={(e) => setEspecifica(e.target.value)}
            />
          </Field>
          <Field label="Mensurável" example={OBJECTIVE_EXAMPLES.mensuravel}>
            <Textarea
              rows={2}
              value={mensuravel}
              onChange={(e) => setMensuravel(e.target.value)}
            />
          </Field>
          <Field label="Atingível" example={OBJECTIVE_EXAMPLES.atingivel}>
            <Textarea
              rows={2}
              value={atingivel}
              onChange={(e) => setAtingivel(e.target.value)}
            />
          </Field>
          <Field label="Relevante" example={OBJECTIVE_EXAMPLES.relevante}>
            <Textarea
              rows={2}
              value={relevante}
              onChange={(e) => setRelevante(e.target.value)}
            />
          </Field>
          <Field label="Temporal" example={OBJECTIVE_EXAMPLES.temporal}>
            <Input
              type="date"
              value={temporal}
              onChange={(e) => setTemporal(e.target.value)}
            />
          </Field>
        </div>
        <div className="p-0 mt-auto">
          <Button
            onClick={() => void handleCreate()}
            disabled={saving || !title.trim()}
          >
            Criar objetivo
          </Button>
        </div>
      </div>
    </TaskModal>
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
    <TaskModal open={open} onClose={() => onOpenChange(false)}>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-6 gap-4">
        <div className="p-0">
          <h2 className="font-semibold text-foreground">Novo key result</h2>
        </div>
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
        <div className="p-0 mt-auto">
          <Button
            onClick={() => void handleCreate()}
            disabled={saving || !title.trim()}
          >
            Criar key result
          </Button>
        </div>
      </div>
    </TaskModal>
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
    <TaskModal open={open} onClose={() => onOpenChange(false)}>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-6 gap-4">
        <div className="p-0">
          <h2 className="font-semibold text-foreground">Card 5H2W</h2>
        </div>
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
        <div className="p-0 mt-auto">
          <Button
            onClick={() => void handleCreate()}
            disabled={saving || !oQue.trim()}
          >
            Criar e mandar ao kanban
          </Button>
        </div>
      </div>
    </TaskModal>
  );
}

function Field({
  label,
  example,
  children,
}: {
  label: string;
  example?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-text-2">{label}</p>
      {children}
      {example ? (
        <p className="text-[11px] leading-snug text-text-2">{example}</p>
      ) : null}
    </div>
  );
}
