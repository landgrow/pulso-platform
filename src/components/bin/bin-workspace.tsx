"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Radar } from "lucide-react";
import { toast } from "sonner";
import { notifyBinSubmission } from "@/app/actions/bin";
import { upsertColecao } from "@/app/actions/colecoes";
import { Button } from "@/components/ui/button";
import { DiagCard } from "@/components/admin/diag-card";
import { AutoSaveIndicator } from "@/components/collections/formulario/auto-save-indicator";
import { FormBlocoArea } from "@/components/collections/formulario/form-bloco-area";
import { ProgressBar } from "@/components/collections/formulario/progress-bar";
import { BIN_ENTREGAVEIS } from "@/data/diagnostico-demo";
import { useAutoSave, type AutoSaveStatus } from "@/hooks/use-auto-save";
import {
  BIN_SECTION_DESCRIPTIONS,
  BIN_V2_INSTRUMENT,
  appendBinEvent,
  binDirectedFormStatus,
  binInstrument,
  binRouteLabel,
  binSectionColor,
  binSectionToBloco,
  countBinSection,
  getBinQuestion,
  getBinSection,
  isQuestionVisible,
  parseBinDirected,
  parseBinGeral,
  parseBinSection,
  pruneHiddenAnswers,
  readBinFlow,
  resolveBinRoute,
} from "@/lib/bin-v2";
import type {
  BinAnswers,
  BinEventKind,
  BinFlowMeta,
  BinRoute,
} from "@/lib/bin-v2";

export function BinWorkspace({
  periodoId,
  initialPayload = {},
  initialMetadata,
  readOnly = false,
}: {
  periodoId: string;
  initialPayload?: Partial<BinAnswers>;
  initialMetadata?: Record<string, unknown>;
  readOnly?: boolean;
}): JSX.Element {
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<BinAnswers>(
    () => initialPayload as BinAnswers,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flow, setFlow] = useState<BinFlowMeta>(() =>
    readBinFlow(initialMetadata),
  );
  const [submitting, setSubmitting] = useState(false);

  const persist = useCallback(
    async (payload: BinAnswers, nextFlow: BinFlowMeta) => {
      const route = resolveBinRoute(payload);
      const result = await upsertColecao({
        periodoId,
        tipo: "formulario",
        payload: pruneHiddenAnswers(payload),
        metadata: {
          area: "formulario",
          instrument: BIN_V2_INSTRUMENT,
          route,
          geralEnviadoEm: nextFlow.geralEnviadoEm,
          diagnosticoEnviadoEm: nextFlow.diagnosticoEnviadoEm,
          setoresEnviados: nextFlow.setoresEnviados,
          events: nextFlow.events,
        },
      });
      if (!result.success) {
        toast.error("Erro ao salvar", { description: result.error });
        throw new Error(result.error);
      }
    },
    [periodoId],
  );

  const notifyStaff = useCallback(
    (kind: BinEventKind, sectionId?: string) => {
      void notifyBinSubmission({
        periodoId,
        kind,
        ...(sectionId ? { sectionId } : {}),
      });
    },
    [periodoId],
  );

  const handleSave = useCallback(
    async (payload: BinAnswers) => {
      await persist(payload, flow);
    },
    [persist, flow],
  );

  const { save, status } = useAutoSave<BinAnswers>({
    onSave: handleSave,
    debounceMs: 1500,
  });

  // Só grava depois que o cliente mexe — abrir a tela não é uma edição.
  const touchedRef = useRef(false);
  useEffect(() => {
    if (!touchedRef.current) {
      touchedRef.current = true;
      return;
    }
    if (!readOnly) save(answers);
  }, [answers, readOnly, save]);

  const route = resolveBinRoute(answers);
  const directedStatus = route ? binDirectedFormStatus(route) : null;
  const geralSection = getBinSection("geral");
  const directedSections = binInstrument.sections.filter(
    (s) => s.id !== "geral",
  );

  function onFieldChange(id: string, value: unknown): void {
    setAnswers((prev) =>
      pruneHiddenAnswers({
        ...prev,
        [id]: value as BinAnswers[string],
      }),
    );
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function enviarGeral(): Promise<void> {
    const parsed = parseBinGeral(answers);
    if (!parsed.success) {
      setErrors(parsed.errors);
      toast.error("Falta responder o diagnóstico geral");
      return;
    }
    const nextRoute = resolveBinRoute(answers);
    if (!nextRoute) {
      setErrors({
        G07: "Escolha o que dá mais dinheiro hoje: fabricar, revender ou prestar serviços.",
      });
      toast.error("Ainda não dá para saber a categoria");
      return;
    }
    const nextFlow = appendBinEvent(flow, {
      at: new Date().toISOString(),
      kind: "geral",
      sectionId: "geral",
      route: nextRoute,
    });
    setSubmitting(true);
    try {
      await persist(answers, nextFlow);
      setFlow(nextFlow);
      setSectionId(null);
      notifyStaff("geral", "geral");
      toast.success(`Categoria: ${binRouteLabel(nextRoute)}`);
    } catch {
      /* persist already toasts */
    } finally {
      setSubmitting(false);
    }
  }

  async function enviarSetor(id: string): Promise<void> {
    const parsed = parseBinSection(id, answers);
    if (!parsed.success) {
      setErrors(parsed.errors);
      toast.error("Falta responder este setor");
      return;
    }
    const nextFlow = appendBinEvent(flow, {
      at: new Date().toISOString(),
      kind: "setor",
      sectionId: id,
      route,
    });
    setSubmitting(true);
    try {
      await persist(answers, nextFlow);
      setFlow(nextFlow);
      setSectionId(null);
      notifyStaff("setor", id);
      toast.success("Setor enviado. A Land Grow já foi avisada.");
    } catch {
      /* persist already toasts */
    } finally {
      setSubmitting(false);
    }
  }

  async function enviarDiagnostico(): Promise<void> {
    const parsed = parseBinDirected(answers);
    if (!parsed.success) {
      setErrors(parsed.errors);
      toast.error("Falta responder os setores");
      return;
    }
    const nextFlow = appendBinEvent(flow, {
      at: new Date().toISOString(),
      kind: "diagnostico",
      route,
    });
    setSubmitting(true);
    try {
      await persist(answers, nextFlow);
      setFlow(nextFlow);
      notifyStaff("diagnostico");
      toast.success("Diagnóstico enviado. A análise começa agora.");
    } catch {
      /* persist already toasts */
    } finally {
      setSubmitting(false);
    }
  }

  const section = sectionId ? getBinSection(sectionId) : undefined;
  const bloco = useMemo(
    () => (section ? binSectionToBloco(section) : null),
    [section],
  );

  if (section && bloco) {
    const { filled, total } = countBinSection(section, answers);
    const isGeral = section.id === "geral";
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => setSectionId(null)}
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </button>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="text-sm text-text-2">
              {BIN_SECTION_DESCRIPTIONS[section.id] ?? section.title} · {filled}{" "}
              de {total} perguntas
            </p>
          </div>
          <AutoSaveIndicator status={status} />
        </div>
        <ProgressBar
          percent={total === 0 ? 0 : Math.round((filled / total) * 100)}
        />
        <FormBlocoArea
          numbered
          bloco={bloco}
          values={answers}
          errors={errors}
          defaultOpen
          readOnly={readOnly || Boolean(flow.diagnosticoEnviadoEm)}
          isVisible={(id) => {
            const q = getBinQuestion(id);
            return q ? isQuestionVisible(q, answers) : true;
          }}
          onChange={onFieldChange}
        />
        {!readOnly && !flow.diagnosticoEnviadoEm ? (
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={submitting}
              onClick={() =>
                void (isGeral ? enviarGeral() : enviarSetor(section.id))
              }
            >
              Enviar
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  if (flow.diagnosticoEnviadoEm && route) {
    return (
      <DiagnosticoDisponivel
        route={route}
        onBack={() =>
          setFlow((prev) => ({ ...prev, diagnosticoEnviadoEm: null }))
        }
        canReopen={!readOnly}
      />
    );
  }

  if (!flow.geralEnviadoEm) {
    const geralCount = geralSection
      ? countBinSection(geralSection, answers)
      : { filled: 0, total: 0 };
    return (
      <div className="space-y-6">
        <Header
          status={status}
          lead="Primeiro o diagnóstico geral. Com as respostas, o sistema abre o formulário certo: serviços, varejo ou indústria."
        />
        {geralSection ? (
          <DiagCard
            index={1}
            indexLabel="Etapa"
            color={binSectionColor(geralSection)}
            title={geralSection.title}
            meta={BIN_SECTION_DESCRIPTIONS.geral ?? ""}
            total={geralCount.total}
            respondidas={geralCount.filled}
            countLabel="pergs."
            onClick={() => setSectionId("geral")}
          />
        ) : null}
      </div>
    );
  }

  if (directedStatus === "pending" && route) {
    return (
      <div className="space-y-6">
        <Header
          status={status}
          lead={`O diagnóstico geral classificou a empresa como ${binRouteLabel(route)}. O formulário dessa categoria ainda está em preparação. Quando sair, aparece aqui.`}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setSectionId("geral")}
        >
          Revisar diagnóstico geral
        </Button>
      </div>
    );
  }

  if (directedStatus === "coverage" && route) {
    return (
      <div className="space-y-6">
        <Header
          status={status}
          lead="A empresa ainda está decidindo o que fazer. Não abre o formulário dos dez setores. A leitura segue no formato de pré-operação."
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setSectionId("geral")}
        >
          Revisar diagnóstico geral
        </Button>
      </div>
    );
  }

  const directedCounts = directedSections.map((s) => ({
    section: s,
    ...countBinSection(s, answers),
  }));
  const directedFilled = directedCounts.reduce((n, c) => n + c.filled, 0);
  const directedTotal = directedCounts.reduce((n, c) => n + c.total, 0);
  const directedPct =
    directedTotal === 0
      ? 0
      : Math.round((directedFilled / directedTotal) * 100);

  return (
    <div className="space-y-6">
      <Header
        status={status}
        lead={`Formulário de ${binRouteLabel(route)}. Responda os setores e, no fim, envie para gerar a análise.`}
      />
      <div className="space-y-2 rounded-lg border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-2">
            Progresso de {binRouteLabel(route)}
          </span>
          <span className="font-medium">
            {directedFilled} de {directedTotal} ({directedPct}%)
          </span>
        </div>
        <ProgressBar percent={directedPct} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {directedCounts.map((c, i) => (
          <DiagCard
            key={c.section.id}
            index={i + 1}
            indexLabel="Área"
            color={binSectionColor(c.section)}
            title={c.section.title}
            meta={BIN_SECTION_DESCRIPTIONS[c.section.id] ?? ""}
            total={c.total}
            respondidas={c.filled}
            countLabel="pergs."
            onClick={() => setSectionId(c.section.id)}
          />
        ))}
      </div>
      {!readOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSectionId("geral")}
          >
            Revisar diagnóstico geral
          </Button>
          <Button
            type="button"
            disabled={submitting || directedPct < 100}
            onClick={() => void enviarDiagnostico()}
          >
            Enviar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Header({
  status,
  lead,
}: {
  status: AutoSaveStatus;
  lead: string;
}): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Radar className="h-5 w-5 text-text-2" />
          Business Insights Navigator
        </h2>
        <p className="text-sm text-text-2">{lead}</p>
      </div>
      <AutoSaveIndicator status={status} />
    </div>
  );
}

function DiagnosticoDisponivel({
  route,
  onBack,
  canReopen,
}: {
  route: BinRoute;
  onBack: () => void;
  canReopen: boolean;
}): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          Diagnóstico de {binRouteLabel(route)}
        </h2>
        <p className="text-sm text-text-2 mt-1">
          As respostas foram enviadas. A análise deste segmento está em
          andamento. Os entregáveis ficam nesta tela quando o time concluir.
        </p>
      </div>
      <div className="divide-y divide-border rounded-lg border border-border bg-surface-1 px-4">
        {BIN_ENTREGAVEIS.map((d) => (
          <div
            key={d.nome}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div>
              <p className="text-sm font-semibold">{d.nome}</p>
              <p className="text-xs text-text-2 mt-0.5">{d.desc}</p>
            </div>
            <span className="shrink-0 text-xs text-text-2">Em análise</span>
          </div>
        ))}
      </div>
      {canReopen ? (
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar às respostas
        </Button>
      ) : null}
    </div>
  );
}
