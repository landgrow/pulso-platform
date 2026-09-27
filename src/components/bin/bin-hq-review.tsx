"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  binEventHeadline,
  binInstrument,
  binRouteLabel,
  countBinSection,
  formatBinAnswer,
  getBinQuestion,
  isQuestionVisible,
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
  const [openId, setOpenId] = useState<string | null>(
    flow.geralEnviadoEm ? "geral" : null,
  );

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
                ? binInstrument.sections.find((s) => s.id === event.sectionId)
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

      <div className="space-y-3">
        {binInstrument.sections.map((section) => {
          const { filled, total } = countBinSection(section, answers);
          if (filled === 0 && total > 0 && section.id !== "geral") {
            if (!flow.geralEnviadoEm) return null;
          }
          const sentAt = flow.setoresEnviados[section.id];
          const isOpen = openId === section.id;
          return (
            <div
              key={section.id}
              className="rounded-lg border border-border bg-surface-1"
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                onClick={() => setOpenId(isOpen ? null : section.id)}
              >
                <div>
                  <p className="text-sm font-medium">{section.title}</p>
                  <p className="text-xs text-text-2 mt-0.5">
                    {filled} de {total}
                    {sentAt
                      ? ` · enviado ${formatDate(sentAt, { dateStyle: "short", timeStyle: "short" })}`
                      : ""}
                  </p>
                </div>
                <span className="text-xs text-text-2">
                  {isOpen ? "Fechar" : "Ver respostas"}
                </span>
              </button>
              {isOpen ? (
                <dl className="space-y-4 border-t border-border px-4 py-4">
                  {section.questionIds.map((id) => {
                    const question = getBinQuestion(id);
                    if (!question || !isQuestionVisible(question, answers)) {
                      return null;
                    }
                    const answer = formatBinAnswer(question, answers);
                    return (
                      <div key={id}>
                        <dt className="text-xs font-medium text-text-2">
                          {question.id} · {question.prompt}
                        </dt>
                        <dd className="mt-1 text-sm whitespace-pre-wrap">
                          {answer ?? (
                            <span className="text-text-2">Sem resposta</span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
