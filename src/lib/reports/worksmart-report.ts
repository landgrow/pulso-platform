import {
  isObjectiveAchieved,
  krProgressLabel,
  objectiveProgressPercent,
} from "@/lib/worksmart/cascade";
import {
  WORKSMART_STATUS_LABELS,
  type WorksmartObjective,
} from "@/types/worksmart";
import type { PdfBlock } from "./pdf-document";

export function worksmartPdfBlocks(
  objectives: WorksmartObjective[],
): PdfBlock[] {
  if (objectives.length === 0) {
    return [
      {
        type: "p",
        text: "Nenhum objetivo WorkSmart neste recorte.",
      },
    ];
  }

  const wins = objectives.filter(isObjectiveAchieved).length;
  const blocks: PdfBlock[] = [
    {
      type: "kpi",
      items: [
        { label: "Objetivos", value: String(objectives.length) },
        { label: "Concluidos", value: String(wins) },
        {
          label: "Em aberto",
          value: String(objectives.length - wins),
        },
      ],
    },
  ];

  for (const objective of objectives) {
    const pct = Math.round(objectiveProgressPercent(objective.keyResults));
    const result = isObjectiveAchieved(objective)
      ? "Resultado atingido"
      : "Em curso";
    blocks.push({
      type: "h1",
      text: `${objective.title}  (${WORKSMART_STATUS_LABELS[objective.status]} · ${pct}% · ${result})`,
    });
    if (objective.orgName || objective.setor) {
      blocks.push({
        type: "p",
        text: [objective.orgName, objective.setor].filter(Boolean).join(" · "),
      });
    }
    blocks.push({
      type: "p",
      text: smartLine("Especifica", objective.smartEspecifica),
    });
    blocks.push({
      type: "p",
      text: smartLine("Mensuravel", objective.smartMensuravel),
    });
    blocks.push({
      type: "p",
      text: smartLine("Atingivel", objective.smartAtingivel),
    });
    blocks.push({
      type: "p",
      text: smartLine("Relevante", objective.smartRelevante),
    });
    blocks.push({
      type: "p",
      text: smartLine("Temporal", objective.smartTemporal),
    });

    if (objective.keyResults.length === 0) {
      blocks.push({ type: "p", text: "Sem key results ainda." });
      continue;
    }

    blocks.push({
      type: "table",
      headers: ["Key result", "Atual / meta", "Atividades", "Feitas"],
      rows: objective.keyResults.map((kr) => {
        const done = kr.actions.filter((action) => action.done).length;
        return [
          kr.title,
          krProgressLabel({
            current: kr.currentValue,
            target: kr.targetValue,
            unit: kr.unit,
            doneCards: done,
            totalCards: kr.actions.length,
          }),
          String(kr.actions.length),
          String(done),
        ];
      }),
    });

    const actionRows = objective.keyResults.flatMap((kr) =>
      kr.actions.map((action) => [
        kr.title,
        action.oQue,
        action.quemNome ?? "-",
        action.quando ?? "-",
        action.done ? "Feita" : (action.columnLabel ?? "Aberta"),
      ]),
    );
    if (actionRows.length > 0) {
      blocks.push({ type: "h2", text: "Atividades geradas (5H2W / kanban)" });
      blocks.push({
        type: "table",
        headers: ["KR", "O que", "Quem", "Quando", "Status"],
        rows: actionRows,
      });
    }
  }

  return blocks;
}

function smartLine(label: string, value: string | null): string {
  return `${label}: ${value?.trim() || "-"}`;
}
