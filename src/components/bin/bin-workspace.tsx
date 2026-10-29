"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Radar } from "lucide-react";
import { toast } from "sonner";
import { loadBinReadingView, notifyBinSubmission } from "@/app/actions/bin";
import { upsertColecao } from "@/app/actions/colecoes";
import { Button } from "@/components/ui/button";
import { DiagCard } from "@/components/admin/diag-card";
import { BinSectorPanel } from "@/components/bin/bin-sector-panel";
import { AutoSaveIndicator } from "@/components/collections/formulario/auto-save-indicator";
import { FormBlocoArea } from "@/components/collections/formulario/form-bloco-area";
import { ProgressBar } from "@/components/collections/formulario/progress-bar";
import { BinReadingPanel } from "@/components/bin/bin-reading-panel";
import { BinShareLinks } from "@/components/bin/bin-share-links";
import { useAutoSave, type AutoSaveStatus } from "@/hooks/use-auto-save";
import { useQueryParams } from "@/hooks/use-query-params";
import {
  BIN_SECTION_DESCRIPTIONS,
  appendBinEvent,
  binDirectedFormStatus,
  binRouteLabel,
  binSectionColor,
  binSectionToBloco,
  countBinSection,
  getBinQuestion,
  getBinSection,
  isQuestionVisible,
  packIdFor,
  parseBinDirected,
  parseBinGeral,
  parseBinSection,
  pruneHiddenAnswers,
  readBinFlow,
  resolveBinRoute,
  resolveShareSectionAmong,
  setDefaultBinInstrument,
  shareSectionsOf,
} from "@/lib/bin-v2/client";
import type {
  BinAnswers,
  BinEventKind,
  BinFlowMeta,
  BinInstrument,
  BinPackId,
  BinReadingView,
  BinRoute,
  BinShareSection,
} from "@/lib/bin-v2/client";

export function BinWorkspace({
  periodoId,
  instruments,
  shareSections,
  initialView = null,
  initialPayload = {},
  initialMetadata,
  readOnly = false,
  shareSlug,
  initialSectionId = null,
}: {
  periodoId: string;
  /** Questionários PÚBLICOS (sem pesos/notas) — vêm prontos do servidor. */
  instruments: Record<BinPackId, BinInstrument>;
  shareSections: BinShareSection[];
  /** Leitura calculada no servidor; atualizada após cada envio. */
  initialView?: BinReadingView | null;
  initialPayload?: Partial<BinAnswers>;
  initialMetadata?: Record<string, unknown>;
  readOnly?: boolean;
  shareSlug?: string;
  initialSectionId?: string | null;
}): JSX.Element {
  setDefaultBinInstrument(instruments.servicos);
  const instrumentOf = (r: BinRoute | null): BinInstrument =>
    instruments[packIdFor(r)];
  const validSectionIds = useMemo(
    () => new Set(shareSectionsOf(Object.values(instruments)).map((x) => x.id)),
    [instruments],
  );
  const resolveBinShareSection = (
    id: string | null | undefined,
    geralEnviadoEm: string | null | undefined,
  ): string | null =>
    resolveShareSectionAmong(validSectionIds, id, geralEnviadoEm);
  const [view, setView] = useState<BinReadingView | null>(initialView);
  const refreshView = useCallback(async () => {
    const result = await loadBinReadingView(periodoId);
    if (result.success) setView(result.data);
  }, [periodoId]);

  const query = useQueryParams();
  const [sectionId, setSectionId] = useState<string | null>(() =>
    resolveBinShareSection(
      initialSectionId ?? query.get("setor"),
      readBinFlow(initialMetadata).geralEnviadoEm,
    ),
  );
  const [flow, setFlow] = useState<BinFlowMeta>(() =>
    readBinFlow(initialMetadata),
  );

  function openSection(id: string | null): void {
    if (id === null && sectionId !== null) void refreshView();
    const allowed =
      id === null ? null : resolveBinShareSection(id, flow.geralEnviadoEm);
    setSectionId(allowed);
    query.update({ setor: allowed }, "push");
  }

  useEffect(() => {
    function onPop(): void {
      const setor = new URLSearchParams(window.location.search).get("setor");
      setSectionId(resolveBinShareSection(setor, flow.geralEnviadoEm));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [flow.geralEnviadoEm]);
  const [answers, setAnswers] = useState<BinAnswers>(
    () => initialPayload as BinAnswers,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const persist = useCallback(
    async (payload: BinAnswers, nextFlow: BinFlowMeta) => {
      const nextRoute = resolveBinRoute(payload);
      const instrument = instruments[packIdFor(nextRoute)];
      const result = await upsertColecao({
        periodoId,
        tipo: "formulario",
        payload: pruneHiddenAnswers(payload, instrument),
        metadata: {
          area: "formulario",
          instrument: instrument.instrument,
          route: nextRoute,
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
    [periodoId, instruments],
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
  const pack = { instrument: instrumentOf(route) };
  const directedStatus = route ? binDirectedFormStatus(route) : null;
  const geralSection = getBinSection("geral", pack.instrument);
  const directedSections = pack.instrument.sections.filter(
    (s) => s.id !== "geral",
  );

  function onFieldChange(id: string, value: unknown): void {
    setAnswers((prev) => {
      const next = {
        ...prev,
        [id]: value as BinAnswers[string],
      };
      return pruneHiddenAnswers(next, instrumentOf(resolveBinRoute(next)));
    });
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function enviarGeral(): Promise<void> {
    const parsed = parseBinGeral(answers, pack.instrument);
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
      openSection(null);
      notifyStaff("geral", "geral");
      void refreshView();
      toast.success(`Categoria: ${binRouteLabel(nextRoute)}`);
    } catch {
      /* persist already toasts */
    } finally {
      setSubmitting(false);
    }
  }

  async function enviarSetor(id: string): Promise<void> {
    const parsed = parseBinSection(id, answers, pack.instrument);
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
      openSection(null);
      notifyStaff("setor", id);
      void refreshView();
      toast.success(
        "Setor enviado. Radar, Compass, Horizon e Route Planner deste setor já foram gerados.",
      );
    } catch {
      /* persist already toasts */
    } finally {
      setSubmitting(false);
    }
  }

  async function enviarDiagnostico(): Promise<void> {
    const parsed = parseBinDirected(answers, pack.instrument);
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
      void refreshView();
      toast.success("Diagnóstico enviado. A análise começa agora.");
    } catch {
      /* persist already toasts */
    } finally {
      setSubmitting(false);
    }
  }

  const section = sectionId
    ? getBinSection(sectionId, pack.instrument)
    : undefined;
  const bloco = section ? binSectionToBloco(section, pack.instrument) : null;

  if (section && bloco) {
    const { filled, total } = countBinSection(
      section,
      answers,
      pack.instrument,
    );
    const isGeral = section.id === "geral";
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => openSection(null)}
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
            const q = getBinQuestion(id, pack.instrument);
            return q ? isQuestionVisible(q, answers, pack.instrument) : true;
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
        view={view}
        flow={flow}
        shareSections={shareSections}
        onOpenSection={(id) => openSection(id)}
        onBack={() =>
          setFlow((prev) => ({ ...prev, diagnosticoEnviadoEm: null }))
        }
        canReopen={!readOnly}
        {...(shareSlug ? { shareSlug } : {})}
      />
    );
  }

  if (!flow.geralEnviadoEm) {
    const geralCount = geralSection
      ? countBinSection(geralSection, answers, pack.instrument)
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
            onClick={() => openSection("geral")}
          />
        ) : null}
        {shareSlug ? (
          <BinShareLinks slug={shareSlug} sections={shareSections} />
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
          onClick={() => openSection("geral")}
        >
          Revisar diagnóstico geral
        </Button>
        {shareSlug ? (
          <BinShareLinks slug={shareSlug} sections={shareSections} />
        ) : null}
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
          onClick={() => openSection("geral")}
        >
          Revisar diagnóstico geral
        </Button>
        {shareSlug ? (
          <BinShareLinks slug={shareSlug} sections={shareSections} />
        ) : null}
      </div>
    );
  }

  const directedCounts = directedSections.map((s) => ({
    section: s,
    ...countBinSection(s, answers, pack.instrument),
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
        lead={`Formulário de ${binRouteLabel(route)}. Cada setor enviado já gera Radar, Compass, Horizon e Route Planner daquele setor. Os quatro se atualizam conforme os outros setores entram.`}
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
      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            onClick={() => openSection(c.section.id)}
          />
        ))}
      </div>
      {shareSlug ? (
        <BinShareLinks slug={shareSlug} sections={shareSections} />
      ) : null}
      {Object.keys(flow.setoresEnviados).length > 0 && view ? (
        <BinReadingPanel view={view} flow={flow} />
      ) : null}
      {!readOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => openSection("geral")}
          >
            Revisar diagnóstico geral
          </Button>
          <Button
            type="button"
            disabled={submitting || directedPct < 100}
            onClick={() => void enviarDiagnostico()}
          >
            Enviar diagnóstico completo
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
          BIN · Diagnóstico da empresa
        </h2>
        <p className="text-sm text-text-2">{lead}</p>
      </div>
      <AutoSaveIndicator status={status} />
    </div>
  );
}

function DiagnosticoDisponivel({
  route,
  view,
  flow,
  shareSections,
  onOpenSection,
  onBack,
  canReopen,
  shareSlug,
}: {
  route: BinRoute;
  view: BinReadingView | null;
  flow: BinFlowMeta;
  shareSections: BinShareSection[];
  onOpenSection: (sectionId: string) => void;
  onBack: () => void;
  canReopen: boolean;
  shareSlug?: string;
}): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          Diagnóstico de {binRouteLabel(route)}
        </h2>
        <p className="text-sm text-text-2 mt-1">
          As respostas foram enviadas. Portões, inconsistências e os quatro
          entregáveis já estão calculados com o que foi respondido.
        </p>
      </div>
      {view ? (
        <>
          <BinReadingPanel view={view} flow={flow} />
          <BinSectorPanel
            rows={view.sectors}
            flow={flow}
            showScore
            onSelect={onOpenSection}
          />
        </>
      ) : (
        <p className="text-sm text-text-2">Calculando a leitura…</p>
      )}
      {shareSlug ? (
        <BinShareLinks slug={shareSlug} sections={shareSections} />
      ) : null}
      {canReopen ? (
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar às respostas
        </Button>
      ) : null}
    </div>
  );
}
