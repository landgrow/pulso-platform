import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBinPeriod } from "@/lib/collections/bin-period";
import { binProgressFromPayload } from "@/lib/bin-v2";
import {
  MIN_BLOCK_CATALOG,
  MIN_TOTAL_PERGUNTAS,
  readMinPerguntas,
} from "@/lib/min/blocks";

export type PeriodRange = "7d" | "30d" | "90d" | "12m" | "ano";

export const PERIOD_RANGE_LABEL: Record<PeriodRange, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  "12m": "Últimos 12 meses",
  ano: "Este ano",
};

export function parseRange(raw: string | undefined): PeriodRange {
  return raw && raw in PERIOD_RANGE_LABEL ? (raw as PeriodRange) : "30d";
}

export type TaskBucket = "a_fazer" | "andamento" | "concluida";

export interface PortalTask {
  id: string;
  titulo: string;
  prazo: string | null;
  prioridade: string;
  setor: string | null;
  boardName: string;
  columnLabel: string;
  bucket: TaskBucket;
  atrasada: boolean;
}

export interface PortalOverview {
  binPct: number;
  minPct: number;
  minBlocos: number;
  tasks: PortalTask[];
  stats: {
    total: number;
    andamento: number;
    atrasadas: number;
    concluidas: number;
  };
  byStatus: { label: string; value: number }[];
  byPrazo: { label: string; value: number }[];
}

function rangeStart(range: PeriodRange, now: Date): Date {
  const d = new Date(now);
  if (range === "7d") d.setDate(d.getDate() - 7);
  else if (range === "30d") d.setDate(d.getDate() - 30);
  else if (range === "90d") d.setDate(d.getDate() - 90);
  else if (range === "12m") d.setFullYear(d.getFullYear() - 1);
  else d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function bucketOf(label: string): TaskBucket {
  if (/conclu|feito|done/i.test(label)) return "concluida";
  if (/andamento|revis|fazendo|doing/i.test(label)) return "andamento";
  return "a_fazer";
}

/**
 * Números do Painel do cliente. Chamar SÓ depois de authorizeOrg/
 * authorizeClientSlug — usa o client admin. Boards admin_only e o kanban do
 * CRM ficam de fora (não são do cliente).
 */
export async function loadPortalOverview(
  orgId: string,
  range: PeriodRange,
): Promise<PortalOverview> {
  const admin = await createAdminClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const start = rangeStart(range, now);

  const [bin, minRows, boardsRes] = await Promise.all([
    resolveBinPeriod(orgId, { create: false }),
    admin
      .from("clientes")
      .select("id, min_blocos(bloco, conteudo)")
      .eq("org_id", orgId)
      .maybeSingle(),
    admin.from("boards").select("id, name, kind, module").eq("org_id", orgId),
  ]);

  let binPct = 0;
  if (bin) {
    const { data: colecao } = await admin
      .from("colecoes")
      .select("payload")
      .eq("periodo_id", bin.periodId)
      .eq("tipo", "formulario")
      .neq("status", "descartado")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (colecao?.payload) {
      binPct = binProgressFromPayload(
        colecao.payload as Record<string, unknown>,
      );
    }
  }

  const blocos =
    (
      minRows.data as {
        min_blocos?: { bloco: string; conteudo: unknown }[];
      } | null
    )?.min_blocos ?? [];
  const answered = blocos.reduce(
    (n, b) => n + readMinPerguntas(b.conteudo).length,
    0,
  );
  const minPct = Math.min(
    100,
    Math.round((answered / MIN_TOTAL_PERGUNTAS) * 100),
  );
  const minBlocos = blocos.filter((b) =>
    MIN_BLOCK_CATALOG.some((c) => c.bloco === b.bloco),
  ).length;

  const boards = (
    (boardsRes.data ?? []) as {
      id: string;
      name: string;
      kind: string | null;
      module: string | null;
    }[]
  ).filter(
    (b) =>
      b.kind !== "admin_only" && (b.module ?? "atividades") === "atividades",
  );
  const boardName = new Map(boards.map((b) => [b.id, b.name]));

  let tasks: PortalTask[] = [];
  if (boards.length > 0) {
    const [{ data: cards }, { data: columns }] = await Promise.all([
      admin
        .from("board_cards")
        .select(
          "id, titulo, prazo, prioridade, setor, board_id, column_id, created_at",
        )
        .in(
          "board_id",
          boards.map((b) => b.id),
        ),
      admin
        .from("board_columns")
        .select("id, label")
        .in(
          "board_id",
          boards.map((b) => b.id),
        ),
    ]);
    const columnLabel = new Map(
      ((columns ?? []) as { id: string; label: string }[]).map((c) => [
        c.id,
        c.label,
      ]),
    );
    tasks = (
      (cards ?? []) as {
        id: string;
        titulo: string;
        prazo: string | null;
        prioridade: string;
        setor: string | null;
        board_id: string;
        column_id: string;
        created_at: string;
      }[]
    )
      .filter((c) => {
        const ref = c.prazo
          ? new Date(`${c.prazo}T12:00:00`)
          : new Date(c.created_at);
        // Tarefa com prazo futuro sempre entra; o recorte olha pra trás.
        return ref >= start;
      })
      .map((c) => {
        const label = columnLabel.get(c.column_id) ?? "";
        const bucket = bucketOf(label);
        return {
          id: c.id,
          titulo: c.titulo,
          prazo: c.prazo,
          prioridade: c.prioridade,
          setor: c.setor,
          boardName: boardName.get(c.board_id) ?? "",
          columnLabel: label,
          bucket,
          atrasada: bucket !== "concluida" && !!c.prazo && c.prazo < today,
        };
      });
  }

  const stats = {
    total: tasks.length,
    andamento: tasks.filter((t) => t.bucket === "andamento").length,
    atrasadas: tasks.filter((t) => t.atrasada).length,
    concluidas: tasks.filter((t) => t.bucket === "concluida").length,
  };

  return {
    binPct,
    minPct,
    minBlocos,
    tasks,
    stats,
    byStatus: [
      {
        label: "A fazer",
        value: tasks.filter((t) => t.bucket === "a_fazer").length,
      },
      { label: "Em andamento", value: stats.andamento },
      { label: "Concluídas", value: stats.concluidas },
    ],
    byPrazo: [
      {
        label: "Em dia",
        value: tasks.filter((t) => t.bucket !== "concluida" && !t.atrasada)
          .length,
      },
      { label: "Atrasadas", value: stats.atrasadas },
      { label: "Concluídas", value: stats.concluidas },
    ],
  };
}

export interface PortalKr {
  id: string;
  objectiveId: string;
  title: string;
  objective: string;
  current: number;
  target: number | null;
  unit: string | null;
  pct: number;
}

export interface PortalObjective {
  id: string;
  title: string;
  status: string;
  pct: number;
}

/** Objetivos e KRs (WorkSmart) da org. Chamar só depois de autorizar. */
export async function loadPortalMetrics(
  orgId: string,
): Promise<{ objectives: PortalObjective[]; krs: PortalKr[] }> {
  const admin = await createAdminClient();
  const [{ data: objectives }, { data: krs }] = await Promise.all([
    admin
      .from("worksmart_objectives")
      .select("id, title, status")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true }),
    admin
      .from("worksmart_key_results")
      .select("id, objective_id, title, current_value, target_value, unit")
      .eq("org_id", orgId)
      .order("position", { ascending: true }),
  ]);

  const objTitle = new Map(
    ((objectives ?? []) as { id: string; title: string }[]).map((o) => [
      o.id,
      o.title,
    ]),
  );
  const krList: PortalKr[] = (
    (krs ?? []) as {
      id: string;
      objective_id: string;
      title: string;
      current_value: number | string | null;
      target_value: number | string | null;
      unit: string | null;
    }[]
  ).map((k) => {
    const current = Number(k.current_value ?? 0);
    const target = k.target_value === null ? null : Number(k.target_value);
    const pct =
      target && target > 0
        ? Math.max(0, Math.min(100, Math.round((current / target) * 100)))
        : 0;
    return {
      id: k.id,
      objectiveId: k.objective_id,
      title: k.title,
      objective: objTitle.get(k.objective_id) ?? "",
      current,
      target,
      unit: k.unit,
      pct,
    };
  });

  const objectivesOut: PortalObjective[] = (
    (objectives ?? []) as { id: string; title: string; status: string }[]
  ).map((o) => {
    const own = krList.filter((k) => k.objectiveId === o.id);
    const pct =
      o.status === "concluido"
        ? 100
        : own.length > 0
          ? Math.round(own.reduce((n, k) => n + k.pct, 0) / own.length)
          : 0;
    return { id: o.id, title: o.title, status: o.status, pct };
  });

  return { objectives: objectivesOut, krs: krList };
}
