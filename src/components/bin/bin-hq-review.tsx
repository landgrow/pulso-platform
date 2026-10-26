"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BinReadingPanel } from "@/components/bin/bin-reading-panel";
import { BinSectorPanel } from "@/components/bin/bin-sector-panel";
import {
  binAnswerScoreLabel,
  binEventHeadline,
  binRouteLabel,
  binSectionScoreLabel,
  formatBinAnswer,
  getBinQuestion,
  isQuestionVisible,
  packFor,
  scoreBinSection,
} from "@/lib/bin-v2";
import type { BinAnswers, BinFlowMeta, BinRoute } from "@/lib/bin-v2";
import { formatDate } from "@/lib/utils";

export function BinHqReview({
  payload,
  route,
  flow,
  periodoLabel,
}: {
  payload: Partial<BinAnswers>;
  route: BinRoute | null;
  flow: BinFlowMeta;
  periodoLabel: string | null;
}): JSX.Element {
  const answers = payload as BinAnswers;
  const pack = packFor(route);
  const [openId, setOpenId] = useState<string | null>(
    flow.geralEnviadoEm ? "geral" : null,
  );
  const openSection = openId
    ? pack.instrument.sections.find((section) => section.id === openId)
    : undefined;
  const openScore = openSection
    ? scoreBinSection(openSection, answers, pack.instrument)
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {periodoLabel ? <Badge variant="outline">{periodoLabel}</Badge> : null}
        {flow.geralEnviadoEm ? (
          <Badge variant="success">
            Geral em{" "}
            {formatDate(flow.geralEnviadoEm, {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </Badge>
        ) : (
          <Badge variant="outline">Geral ainda não enviado</Badge>
        )}
        {route ? <Badge variant="outline">{binRouteLabel(route)}</Badge> : null}
        {flow.diagnosticoEnviadoEm ? (
          <Badge variant="success">BIN completo enviado</Badge>
        ) : null}
      </div>

      {flow.events.length > 0 ? (
        <ol className="space-y-2 text-sm">
          {flow.events
            .slice()
            .reverse()
            .map((event) => {
              const section = event.sectionId
                ? pack.instrument.sections.find((s) => s.id === event.sectionId)
                : undefined;
              return (
                <li
                  key={`${event.kind}-${event.at}-${event.sectionId ?? ""}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-text-2"
                >
                  <span>
                    {binEventHeadline({
                      kind: event.kind,
                      routeLabel: binRouteLabel(event.route ?? route),
                      ...(section ? { sectionTitle: section.title } : {}),
                    })}
                  </span>
                  <span className="text-xs">
                    {formatDate(event.at, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </li>
              );
            })}
        </ol>
      ) : null}

      <BinReadingPanel
        answers={answers}
        route={route}
        flow={flow}
        selectedSectionId={openId === "geral" ? null : openId}
        onSelectSection={(sectionId) => setOpenId(sectionId ?? "geral")}
      />

      <BinSectorPanel
        answers={answers}
        flow={flow}
        route={route}
        selectedId={openId}
        showScore
        onSelect={(sectionId) =>
          setOpenId((current) => (current === sectionId ? null : sectionId))
        }
      />

      {openSection ? (
        <dl className="space-y-4 rounded-lg border border-border bg-surface-1 px-4 py-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{openSection.title}</p>
              {openScore ? (
                <p className="mt-0.5 text-sm text-text-2">
                  {binSectionScoreLabel(openScore) ??
                    "Diagnóstico geral não recebe nota. Essas perguntas são contexto."}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="text-xs text-text-2 hover:text-text-1"
              onClick={() => setOpenId(null)}
            >
              Fechar
            </button>
          </div>
          {openSection.id !== "geral" ? (
            <p className="text-xs text-text-2">
              O número ao lado vale só para essa pergunta, de 0 a 100. Ele não
              soma na nota do setor.
            </p>
          ) : null}
          {openSection.questionIds.map((id) => {
            const question = getBinQuestion(id, pack.instrument);
            if (
              !question ||
              !isQuestionVisible(question, answers, pack.instrument)
            ) {
              return null;
            }
            const answer = formatBinAnswer(question, answers);
            const points = binAnswerScoreLabel(
              question,
              answers,
              pack.instrument,
            );
            return (
              <div key={id}>
                <dt className="text-xs font-medium text-text-2">
                  {question.id} · {question.prompt}
                </dt>
                <dd className="mt-1 flex items-baseline justify-between gap-4 text-sm">
                  <span className="whitespace-pre-wrap">
                    {answer ?? (
                      <span className="text-text-2">Sem resposta</span>
                    )}
                  </span>
                  {points ? (
                    <span className="shrink-0 tabular-nums text-text-2">
                      {points}
                    </span>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="text-sm text-text-2">
          Clique num setor para ler as respostas e a pontuação.
        </p>
      )}
    </div>
  );
}
