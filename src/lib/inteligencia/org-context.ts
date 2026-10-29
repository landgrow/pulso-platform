import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBinPeriod } from "@/lib/collections/bin-period";
import {
  binProgressFromPayload,
  binSectionScoreLabel,
  buildBinReading,
  countBinSection,
  formatBinAnswer,
  getBinQuestion,
  packFor,
  resolveBinRoute,
  scoreBinSection,
  type BinAnswers,
} from "@/lib/bin-v2";
import { ADMIN_ONLY_BOARD_KIND } from "@/lib/auth/staff-access";

const MAX_MEETINGS = 8;
const MAX_TASKS = 16;
const MAX_OBJECTIVES = 6;
const MAX_CHARS = 7000;

export interface OrgBinSection {
  id: string;
  title: string;
  filled: number;
  total: number;
  scoreLabel: string | null;
  answers: { prompt: string; answer: string }[];
}

export interface OrgContextPack {
  orgId: string;
  orgName: string;
  orgSlug: string;
  binProgress: number;
  binGates: string[];
  binFlags: string[];
  bin: OrgBinSection[];
  meetings: {
    id: string;
    titulo: string;
    data: string;
    resumo: string | null;
    topicos: string | null;
  }[];
  tasks: {
    titulo: string;
    setor: string | null;
    prazo: string | null;
    coluna: string;
  }[];
  objectives: { title: string; setor: string | null; status: string }[];
}

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function binSectionsFromAnswers(answers: BinAnswers): OrgBinSection[] {
  const pack = packFor(resolveBinRoute(answers));
  return pack.instrument.sections.map((section) => {
    const { filled, total } = countBinSection(
      section,
      answers,
      pack.instrument,
    );
    const items: OrgBinSection["answers"] = [];
    for (const questionId of section.questionIds) {
      if (items.length >= 4) break;
      const question = getBinQuestion(questionId, pack.instrument);
      if (!question) continue;
      const answer = formatBinAnswer(question, answers);
      if (!answer) continue;
      items.push({
        prompt: clip(question.prompt, 80),
        answer: clip(answer, 160),
      });
    }
    return {
      id: section.id,
      title: section.title,
      filled,
      total,
      scoreLabel: binSectionScoreLabel(
        scoreBinSection(section, answers, pack.instrument),
      ),
      answers: items,
    };
  });
}

export async function loadOrgContextPack(
  orgId: string,
): Promise<OrgContextPack | null> {
  const admin = await createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, slug, is_internal")
    .eq("id", orgId)
    .maybeSingle();
  if (!org || org.is_internal) return null;

  const binPeriod = await resolveBinPeriod(orgId, { create: false });

  const [colecaoRes, meetingsRes, boardsRes, objectivesRes] = await Promise.all(
    [
      binPeriod
        ? admin
            .from("colecoes")
            .select("payload")
            .eq("periodo_id", binPeriod.periodId)
            .eq("tipo", "formulario")
            .neq("status", "descartado")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("meetings")
        .select("id, titulo, data, resumo, topicos")
        .eq("org_id", orgId)
        .order("data", { ascending: false })
        .limit(MAX_MEETINGS),
      admin.from("boards").select("id, kind, module").eq("org_id", orgId),
      admin
        .from("worksmart_objectives")
        .select("title, setor, status")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(MAX_OBJECTIVES),
    ],
  );

  const answers = (colecaoRes.data?.payload ?? {}) as BinAnswers;
  const binPack = packFor(resolveBinRoute(answers));
  const reading = buildBinReading(answers, binPack);

  const boards = (
    (boardsRes.data ?? []) as {
      id: string;
      kind: string | null;
      module: string | null;
    }[]
  ).filter(
    (board) =>
      board.kind !== ADMIN_ONLY_BOARD_KIND &&
      (board.module ?? "atividades") === "atividades",
  );

  let tasks: OrgContextPack["tasks"] = [];
  if (boards.length > 0) {
    const boardIds = boards.map((board) => board.id);
    const [{ data: cards }, { data: columns }] = await Promise.all([
      admin
        .from("board_cards")
        .select("titulo, prazo, setor, column_id")
        .in("board_id", boardIds)
        .order("created_at", { ascending: false })
        .limit(MAX_TASKS),
      admin.from("board_columns").select("id, label").in("board_id", boardIds),
    ]);
    const columnLabel = new Map(
      ((columns ?? []) as { id: string; label: string }[]).map((column) => [
        column.id,
        column.label,
      ]),
    );
    tasks = (
      (cards ?? []) as {
        titulo: string;
        prazo: string | null;
        setor: string | null;
        column_id: string;
      }[]
    ).map((card) => ({
      titulo: card.titulo,
      setor: card.setor,
      prazo: card.prazo,
      coluna: columnLabel.get(card.column_id) ?? "",
    }));
  }

  return {
    orgId: org.id as string,
    orgName: org.name as string,
    orgSlug: org.slug as string,
    binProgress: binProgressFromPayload(answers, binPack.instrument),
    binGates: [
      reading.gates.portao1.resumo,
      reading.gates.portao2.resumo,
      reading.gates.portao3.resumo,
    ],
    binFlags: reading.flags.map((flag) => flag.resumo),
    bin: binSectionsFromAnswers(answers),
    meetings: ((meetingsRes.data ?? []) as OrgContextPack["meetings"]).map(
      (meeting) => ({
        ...meeting,
        resumo: meeting.resumo ? clip(meeting.resumo, 400) : null,
        topicos: meeting.topicos ? clip(meeting.topicos, 300) : null,
      }),
    ),
    tasks,
    objectives: (objectivesRes.data ?? []) as OrgContextPack["objectives"],
  };
}

export function renderOrgContext(pack: OrgContextPack): string {
  const lines: string[] = [
    `Empresa: ${pack.orgName} (slug ${pack.orgSlug})`,
    "",
    `Diagnóstico BIN (${pack.binProgress}% preenchido). Portões abrem a leitura; a nota setorial vem depois:`,
    ...pack.binGates.map((gate) => `- Portão: ${gate}`),
  ];
  if (pack.binFlags.length > 0) {
    lines.push("Inconsistências:");
    for (const flag of pack.binFlags) lines.push(`- ${flag}`);
  }
  lines.push("Setores:");
  for (const section of pack.bin) {
    if (section.filled === 0) continue;
    lines.push(
      `- ${section.title}: ${section.filled}/${section.total}${section.scoreLabel ? ` · ${section.scoreLabel}` : ""}`,
    );
    for (const item of section.answers) {
      lines.push(`  ${item.prompt} → ${item.answer}`);
    }
  }
  if (pack.meetings.length > 0) {
    lines.push("", "Reuniões recentes:");
    for (const meeting of pack.meetings) {
      lines.push(`- ${meeting.data} · ${meeting.titulo}`);
      if (meeting.resumo) lines.push(`  Resumo: ${meeting.resumo}`);
      if (meeting.topicos) lines.push(`  Tópicos: ${meeting.topicos}`);
    }
  }
  if (pack.tasks.length > 0) {
    lines.push("", "Tarefas:");
    for (const task of pack.tasks) {
      lines.push(
        `- ${task.titulo}${task.setor ? ` [${task.setor}]` : ""} · ${task.coluna}${task.prazo ? ` · prazo ${task.prazo}` : ""}`,
      );
    }
  }
  if (pack.objectives.length > 0) {
    lines.push("", "Objetivos WorkSmart:");
    for (const objective of pack.objectives) {
      lines.push(
        `- ${objective.title}${objective.setor ? ` [${objective.setor}]` : ""} · ${objective.status}`,
      );
    }
  }
  return clip(lines.join("\n"), MAX_CHARS);
}

export async function loadCarteiraContext(orgIds: string[]): Promise<string> {
  const slices: string[] = [];
  for (const orgId of orgIds.slice(0, 12)) {
    const pack = await loadOrgContextPack(orgId);
    if (!pack) continue;
    slices.push(
      `${pack.orgName}: BIN ${pack.binProgress}%; ${pack.meetings.length} reuniões; ${pack.tasks.length} tarefas.`,
    );
  }
  return clip(
    ["Carteira Land Grow (resumo, não é o livro-caixa):", ...slices].join("\n"),
    MAX_CHARS,
  );
}
