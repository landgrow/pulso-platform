"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffCapabilities } from "@/lib/supabase/platform-role-server";
import { authorizeOrg, type OrgAccess } from "@/lib/auth/org-access";
import { getBoard } from "@/app/actions/boards";
import {
  findTodoColumnId,
  isClosedColumnLabel,
} from "@/lib/boards/plano-de-acao-template";
import {
  derivedObjectiveStatus,
  format5h2wNotes,
  isKrAchieved,
  isSmartComplete,
  resolveCascadeOwner,
  toNumber,
  type FiveH2W,
  type SmartFields,
} from "@/lib/worksmart/cascade";
import {
  suggestActions,
  suggestKeyResults,
} from "@/lib/worksmart/suggest-cascade";
import type {
  WorksmartAction,
  WorksmartKeyResult,
  WorksmartObjective,
  WorksmartStatus,
} from "@/types/worksmart";

type Result<T> = { success: true; data: T } | { success: false; error: string };
type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

const orgIdSchema = z.object({
  orgId: z.string().uuid("Organização inválida"),
});

const idSchema = z.string().uuid();

function emptyToNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
}

const optionalText = z.preprocess(
  emptyToNull,
  z.string().nullable().optional(),
);

const optionalDate = z.preprocess((value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return null;
}, z.string().nullable().optional());

const createObjectiveSchema = z.object({
  orgId: z.string().uuid(),
  title: z.string().trim().min(1, "Título é obrigatório"),
  setor: optionalText,
  smartEspecifica: optionalText,
  smartMensuravel: optionalText,
  smartAtingivel: optionalText,
  smartRelevante: optionalText,
  smartTemporal: optionalDate,
  quemId: z.string().uuid().nullable().optional(),
});

const generateCascadeSchema = z.object({
  objectiveId: z.string().uuid(),
  quemId: z.string().uuid().nullable().optional(),
});

const updateObjectiveSchema = z.object({
  objectiveId: z.string().uuid(),
  title: z.string().trim().min(1).optional(),
  setor: optionalText,
  status: z.enum(["rascunho", "ativo", "concluido"]).optional(),
  smartEspecifica: optionalText,
  smartMensuravel: optionalText,
  smartAtingivel: optionalText,
  smartRelevante: optionalText,
  smartTemporal: optionalDate,
});

const createKrSchema = z.object({
  objectiveId: z.string().uuid(),
  title: z.string().trim().min(1, "Título do key result é obrigatório"),
  targetValue: z.number().nonnegative().nullable().optional(),
  currentValue: z.number().nonnegative().nullable().optional(),
  unit: optionalText,
});

const updateKrSchema = z.object({
  keyResultId: z.string().uuid(),
  title: z.string().trim().min(1).optional(),
  targetValue: z.number().nonnegative().nullable().optional(),
  currentValue: z.number().nonnegative().nullable().optional(),
  unit: optionalText,
});

const createActionSchema = z.object({
  keyResultId: z.string().uuid(),
  oQue: z.string().trim().min(1, "O quê é obrigatório"),
  quemId: z.string().uuid().nullable().optional(),
  quando: optionalDate,
  onde: optionalText,
  porQue: optionalText,
  como: optionalText,
  quanto: optionalText,
});

const OBJECTIVE_SELECT = `
  id, org_id, title, setor,
  smart_especifica, smart_mensuravel, smart_atingivel, smart_relevante, smart_temporal,
  status, created_at,
  organizations ( name ),
  worksmart_key_results (
    id, objective_id, title, target_value, current_value, unit, position,
    worksmart_actions (
      id, key_result_id, o_que, quem_id, quando, onde, por_que, como, quanto, card_id,
      quem:profiles!worksmart_actions_quem_id_fkey ( full_name ),
      card:board_cards!worksmart_actions_card_id_fkey (
        id, board_id, column_id,
        column:board_columns ( label )
      )
    )
  )
`;

type ActionRow = {
  id: string;
  key_result_id: string;
  o_que: string;
  quem_id: string | null;
  quando: string | null;
  onde: string | null;
  por_que: string | null;
  como: string | null;
  quanto: string | null;
  card_id: string | null;
  quem: { full_name: string | null } | null;
  card: {
    id: string;
    board_id: string;
    column_id: string;
    column: { label: string } | { label: string }[] | null;
  } | null;
};

type KrRow = {
  id: string;
  objective_id: string;
  title: string;
  target_value: unknown;
  current_value: unknown;
  unit: string | null;
  position: number;
  worksmart_actions: ActionRow[] | null;
};

type ObjectiveRow = {
  id: string;
  org_id: string;
  title: string;
  setor: string | null;
  smart_especifica: string | null;
  smart_mensuravel: string | null;
  smart_atingivel: string | null;
  smart_relevante: string | null;
  smart_temporal: string | null;
  status: WorksmartStatus;
  created_at: string;
  organizations: { name: string } | { name: string }[] | null;
  worksmart_key_results: KrRow[] | null;
};

function columnLabel(
  column: { label: string } | { label: string }[] | null | undefined,
): string | null {
  if (!column) return null;
  if (Array.isArray(column)) return column[0]?.label ?? null;
  return column.label;
}

function mapAction(row: ActionRow): WorksmartAction {
  const label = columnLabel(row.card?.column);
  return {
    id: row.id,
    keyResultId: row.key_result_id,
    oQue: row.o_que,
    quemId: row.quem_id,
    quemNome: row.quem?.full_name ?? null,
    quando: row.quando,
    onde: row.onde,
    porQue: row.por_que,
    como: row.como,
    quanto: row.quanto,
    cardId: row.card?.id ?? row.card_id,
    boardId: row.card?.board_id ?? null,
    columnLabel: label,
    done: label != null && isClosedColumnLabel(label),
  };
}

function mapKr(row: KrRow): WorksmartKeyResult {
  const actions = (row.worksmart_actions ?? []).map(mapAction);
  return {
    id: row.id,
    objectiveId: row.objective_id,
    title: row.title,
    targetValue: toNumber(row.target_value),
    currentValue: toNumber(row.current_value),
    unit: row.unit,
    position: row.position,
    actions,
  };
}

function mapObjective(row: ObjectiveRow): WorksmartObjective {
  const keyResults = [...(row.worksmart_key_results ?? [])]
    .sort((a, b) => a.position - b.position)
    .map(mapKr);
  return {
    id: row.id,
    orgId: row.org_id,
    title: row.title,
    setor: row.setor,
    smartEspecifica: row.smart_especifica,
    smartMensuravel: row.smart_mensuravel,
    smartAtingivel: row.smart_atingivel,
    smartRelevante: row.smart_relevante,
    smartTemporal: row.smart_temporal,
    status: row.status,
    createdAt: row.created_at,
    orgName: Array.isArray(row.organizations)
      ? (row.organizations[0]?.name ?? null)
      : (row.organizations?.name ?? null),
    keyResults,
  };
}

function smartFromInput(input: {
  smartEspecifica?: string | null | undefined;
  smartMensuravel?: string | null | undefined;
  smartAtingivel?: string | null | undefined;
  smartRelevante?: string | null | undefined;
  smartTemporal?: string | null | undefined;
}): SmartFields {
  return {
    especifica: input.smartEspecifica ?? null,
    mensuravel: input.smartMensuravel ?? null,
    atingivel: input.smartAtingivel ?? null,
    relevante: input.smartRelevante ?? null,
    temporal: input.smartTemporal ?? null,
  };
}

function revalidateAtividades(): void {
  revalidatePath("/admin/atividades");
  revalidatePath("/dashboard");
  revalidatePath("/admin/metricas");
  revalidatePath("/admin/crm");
}

// ─── Autorização ─────────────────────────────────────────────────────────────

type WorksmartAuth =
  | { ok: true; admin: AdminClient; access: OrgAccess }
  | { ok: false; error: string };

/** Resolve a org da linha WorkSmart (via admin) e autoriza o usuário nela. */
async function authorizeWorksmartRow(
  table: "worksmart_objectives" | "worksmart_key_results" | "worksmart_actions",
  id: string,
  notFound: string,
  opts: { write?: boolean } = {},
): Promise<WorksmartAuth> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from(table)
    .select("org_id")
    .eq("id", id)
    .maybeSingle();
  const orgId = (data as { org_id: string | null } | null)?.org_id;
  if (!orgId) return { ok: false, error: notFound };
  const auth = await authorizeOrg(orgId, opts);
  if (!auth.ok) return auth;
  return { ok: true, admin, access: auth.access };
}

/** Plano de Ação padrão da org — getBoard cria quando ainda não existe. */
async function defaultBoardColumns(
  admin: AdminClient,
  orgId: string,
): Promise<
  | { boardId: string; columns: { id: string; label: string }[] }
  | { error: string }
> {
  const { data: existing } = await admin
    .from("boards")
    .select("id")
    .eq("org_id", orgId)
    .eq("module", "atividades")
    .eq("kind", "standard")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const existingId = (existing as { id: string } | null)?.id;
  if (!existingId) {
    const created = await getBoard(orgId);
    if (!created.success) return { error: created.error };
    return { boardId: created.data.id, columns: created.data.columns };
  }
  const { data: columns } = await admin
    .from("board_columns")
    .select("id, label")
    .eq("board_id", existingId)
    .order("position", { ascending: true });
  return {
    boardId: existingId,
    columns: (columns ?? []) as { id: string; label: string }[],
  };
}

/** Promove uma ação do WorkSmart a card do Plano de Ação (sem RPC: o admin client não tem auth.uid()). */
async function promoteActionToCard(
  admin: AdminClient,
  input: {
    actionId: string;
    orgId: string;
    fields: FiveH2W;
    quemId: string | null;
    quando: string | null;
    setor: string | null;
    createdBy: string;
  },
): Promise<{ cardId: string; boardId: string } | { error: string }> {
  const { data: existing } = await admin
    .from("board_cards")
    .select("id, board_id")
    .eq("source_action_id", input.actionId)
    .maybeSingle();
  const existingCard = existing as { id: string; board_id: string } | null;
  if (existingCard?.id && existingCard.board_id) {
    return { cardId: existingCard.id, boardId: existingCard.board_id };
  }

  const board = await defaultBoardColumns(admin, input.orgId);
  if ("error" in board) return { error: board.error };
  const todoId = findTodoColumnId(board.columns);
  if (!todoId) {
    return { error: "O Plano de Ação não tem coluna para novos cards." };
  }

  const { count } = await admin
    .from("board_cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", todoId);

  const { data: card, error: cardError } = await admin
    .from("board_cards")
    .insert({
      board_id: board.boardId,
      column_id: todoId,
      titulo: input.fields.oQue.trim(),
      position: count ?? 0,
      created_by: input.createdBy,
      source_action_id: input.actionId,
      responsavel_id: input.quemId,
      prazo: input.quando,
      setor: input.setor,
      observacoes: format5h2wNotes(input.fields),
    })
    .select("id")
    .single();

  if (cardError || !card) {
    return { error: cardError?.message ?? "Erro ao criar o card 5H2W." };
  }

  await admin
    .from("worksmart_actions")
    .update({ card_id: card.id })
    .eq("id", input.actionId);

  return { cardId: card.id as string, boardId: board.boardId };
}

export async function listWorksmartObjectives(
  orgId?: string,
): Promise<Result<WorksmartObjective[]>> {
  const admin = await createAdminClient();
  let query = admin
    .from("worksmart_objectives")
    .select(OBJECTIVE_SELECT)
    .order("created_at", { ascending: false });

  if (orgId) {
    const parsed = orgIdSchema.safeParse({ orgId });
    if (!parsed.success)
      return { success: false, error: "Organização inválida" };
    const auth = await authorizeOrg(parsed.data.orgId);
    if (!auth.ok) return { success: false, error: auth.error };
    query = query.eq("org_id", parsed.data.orgId);
  } else {
    // Visão de todas as orgs: mesmo recorte da antiga RLS (staff_can('atividades')).
    const supabase = await createClient();
    const capabilities = await getStaffCapabilities(supabase);
    if (!capabilities.includes("atividades")) {
      return { success: false, error: "Acesso restrito à equipe Land Grow" };
    }
  }

  const { data, error } = await query;

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: ((data ?? []) as unknown as ObjectiveRow[]).map(mapObjective),
  };
}

export async function createWorksmartObjective(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = createObjectiveSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const input = parsed.data;

  const auth = await authorizeOrg(input.orgId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const userId = auth.access.user.id;

  const admin = await createAdminClient();
  const status = derivedObjectiveStatus(smartFromInput(input), "rascunho");
  const { data, error } = await admin
    .from("worksmart_objectives")
    .insert({
      org_id: input.orgId,
      title: input.title,
      setor: input.setor ?? null,
      smart_especifica: input.smartEspecifica ?? null,
      smart_mensuravel: input.smartMensuravel ?? null,
      smart_atingivel: input.smartAtingivel ?? null,
      smart_relevante: input.smartRelevante ?? null,
      smart_temporal: input.smartTemporal ?? null,
      status,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Erro ao criar objetivo",
    };
  }
  const objectiveId = data.id as string;
  revalidateAtividades();
  if (isSmartComplete(smartFromInput(input))) {
    await generateWorksmartCascade({
      objectiveId,
      quemId: input.quemId ?? userId,
    });
  }
  return { success: true, data: { id: objectiveId } };
}

export async function updateWorksmartObjective(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = updateObjectiveSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { objectiveId, ...rest } = parsed.data;

  const auth = await authorizeWorksmartRow(
    "worksmart_objectives",
    objectiveId,
    "Objetivo não encontrado",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin } = auth;

  const { data: current, error: fetchError } = await admin
    .from("worksmart_objectives")
    .select(
      "title, setor, status, smart_especifica, smart_mensuravel, smart_atingivel, smart_relevante, smart_temporal",
    )
    .eq("id", objectiveId)
    .single();
  if (fetchError || !current) {
    return {
      success: false,
      error: fetchError?.message ?? "Objetivo não encontrado",
    };
  }

  const nextSmart = smartFromInput({
    smartEspecifica:
      rest.smartEspecifica !== undefined
        ? rest.smartEspecifica
        : current.smart_especifica,
    smartMensuravel:
      rest.smartMensuravel !== undefined
        ? rest.smartMensuravel
        : current.smart_mensuravel,
    smartAtingivel:
      rest.smartAtingivel !== undefined
        ? rest.smartAtingivel
        : current.smart_atingivel,
    smartRelevante:
      rest.smartRelevante !== undefined
        ? rest.smartRelevante
        : current.smart_relevante,
    smartTemporal:
      rest.smartTemporal !== undefined
        ? rest.smartTemporal
        : current.smart_temporal,
  });
  const nextStatus = derivedObjectiveStatus(
    nextSmart,
    rest.status ?? (current.status as WorksmartStatus),
  );

  const patch: Record<string, unknown> = { status: nextStatus };
  if (rest.title !== undefined) patch.title = rest.title;
  if (rest.setor !== undefined) patch.setor = rest.setor;
  if (rest.smartEspecifica !== undefined)
    patch.smart_especifica = rest.smartEspecifica;
  if (rest.smartMensuravel !== undefined)
    patch.smart_mensuravel = rest.smartMensuravel;
  if (rest.smartAtingivel !== undefined)
    patch.smart_atingivel = rest.smartAtingivel;
  if (rest.smartRelevante !== undefined)
    patch.smart_relevante = rest.smartRelevante;
  if (rest.smartTemporal !== undefined)
    patch.smart_temporal = rest.smartTemporal;

  const { data: updated, error } = await admin
    .from("worksmart_objectives")
    .update(patch)
    .eq("id", objectiveId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!updated || updated.length === 0)
    return { success: false, error: "Não encontrado" };

  if (isSmartComplete(nextSmart)) {
    const { count } = await admin
      .from("worksmart_key_results")
      .select("id", { count: "exact", head: true })
      .eq("objective_id", objectiveId);
    if ((count ?? 0) === 0) {
      await generateWorksmartCascade({
        objectiveId,
        quemId: auth.access.user.id,
      });
    }
  }

  revalidateAtividades();
  return { success: true, data: { id: objectiveId } };
}

export async function deleteWorksmartObjective(
  objectiveId: string,
): Promise<Result<{ removed: true }>> {
  const parsed = idSchema.safeParse(objectiveId);
  if (!parsed.success) return { success: false, error: "Objetivo inválido" };

  const auth = await authorizeWorksmartRow(
    "worksmart_objectives",
    parsed.data,
    "Objetivo não encontrado",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.admin
    .from("worksmart_objectives")
    .delete()
    .eq("id", parsed.data)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
  revalidateAtividades();
  return { success: true, data: { removed: true } };
}

export async function createWorksmartKeyResult(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = createKrSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const input = parsed.data;

  const auth = await authorizeWorksmartRow(
    "worksmart_objectives",
    input.objectiveId,
    "Objetivo não encontrado",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin, access } = auth;

  const { data: last } = await admin
    .from("worksmart_key_results")
    .select("position")
    .eq("objective_id", input.objectiveId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("worksmart_key_results")
    .insert({
      objective_id: input.objectiveId,
      org_id: access.orgId,
      title: input.title,
      target_value: input.targetValue ?? null,
      current_value: input.currentValue ?? 0,
      unit: input.unit,
      position: ((last as { position: number } | null)?.position ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Erro ao criar key result",
    };
  }
  revalidateAtividades();
  return { success: true, data: { id: data.id as string } };
}

export async function updateWorksmartKeyResult(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = updateKrSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { keyResultId, ...rest } = parsed.data;

  const auth = await authorizeWorksmartRow(
    "worksmart_key_results",
    keyResultId,
    "Key result não encontrado",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin } = auth;

  const patch: Record<string, unknown> = {};
  if (rest.title !== undefined) patch.title = rest.title;
  if (rest.targetValue !== undefined) patch.target_value = rest.targetValue;
  if (rest.currentValue !== undefined) patch.current_value = rest.currentValue;
  if (rest.unit !== undefined) patch.unit = rest.unit;
  if (Object.keys(patch).length === 0) {
    return { success: true, data: { id: keyResultId } };
  }

  const { data: updated, error } = await admin
    .from("worksmart_key_results")
    .update(patch)
    .eq("id", keyResultId)
    .select("id, objective_id");
  if (error) return { success: false, error: error.message };
  if (!updated || updated.length === 0)
    return { success: false, error: "Não encontrado" };

  if (rest.currentValue !== undefined) {
    const objectiveId = (updated[0] as { objective_id: string | null })
      .objective_id;
    if (objectiveId) {
      const { data: siblings } = await admin
        .from("worksmart_key_results")
        .select("current_value, target_value")
        .eq("objective_id", objectiveId);
      const rows = (siblings ?? []) as {
        current_value: unknown;
        target_value: unknown;
      }[];
      const allHit = rows.every((row) =>
        isKrAchieved({
          currentValue: toNumber(row.current_value),
          targetValue: toNumber(row.target_value),
          actions: [],
        }),
      );
      if (allHit && rows.length > 0) {
        await admin
          .from("worksmart_objectives")
          .update({ status: "concluido" })
          .eq("id", objectiveId)
          .neq("status", "concluido");
      }
    }
  }

  revalidateAtividades();
  return { success: true, data: { id: keyResultId } };
}

export async function deleteWorksmartKeyResult(
  keyResultId: string,
): Promise<Result<{ removed: true }>> {
  const parsed = idSchema.safeParse(keyResultId);
  if (!parsed.success) return { success: false, error: "Key result inválido" };

  const auth = await authorizeWorksmartRow(
    "worksmart_key_results",
    parsed.data,
    "Key result não encontrado",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.admin
    .from("worksmart_key_results")
    .delete()
    .eq("id", parsed.data)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
  revalidateAtividades();
  return { success: true, data: { removed: true } };
}

export async function createWorksmartAction(
  raw: unknown,
): Promise<Result<{ id: string; boardId: string }>> {
  const parsed = createActionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const input = parsed.data;

  const auth = await authorizeWorksmartRow(
    "worksmart_key_results",
    input.keyResultId,
    "Key result não encontrado",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin, access } = auth;

  const { data: kr } = await admin
    .from("worksmart_key_results")
    .select("id, org_id, objective_id")
    .eq("id", input.keyResultId)
    .single();
  if (!kr) return { success: false, error: "Key result não encontrado" };

  const { data: objective } = await admin
    .from("worksmart_objectives")
    .select("setor")
    .eq("id", kr.objective_id)
    .maybeSingle();

  const { data: quem } = input.quemId
    ? await admin
        .from("profiles")
        .select("full_name")
        .eq("id", input.quemId)
        .maybeSingle()
    : { data: null };

  const { data: action, error } = await admin
    .from("worksmart_actions")
    .insert({
      key_result_id: input.keyResultId,
      org_id: access.orgId,
      o_que: input.oQue,
      quem_id: input.quemId ?? null,
      quando: input.quando ?? null,
      onde: input.onde ?? null,
      por_que: input.porQue ?? null,
      como: input.como ?? null,
      quanto: input.quanto ?? null,
    })
    .select("id")
    .single();

  if (error || !action) {
    return { success: false, error: error?.message ?? "Erro ao criar ação" };
  }
  const actionId = action.id as string;

  const promoted = await promoteActionToCard(admin, {
    actionId,
    orgId: access.orgId,
    fields: {
      oQue: input.oQue,
      quem: (quem as { full_name: string | null } | null)?.full_name ?? null,
      quando: input.quando ?? null,
      onde: input.onde ?? null,
      porQue: input.porQue ?? null,
      como: input.como ?? null,
      quanto: input.quanto ?? null,
    },
    quemId: input.quemId ?? null,
    quando: input.quando ?? null,
    setor: (objective as { setor: string | null } | null)?.setor ?? null,
    createdBy: access.user.id,
  });

  if ("error" in promoted) {
    await admin.from("worksmart_actions").delete().eq("id", actionId);
    return { success: false, error: promoted.error };
  }

  revalidateAtividades();
  return {
    success: true,
    data: { id: actionId, boardId: promoted.boardId },
  };
}

export async function deleteWorksmartAction(
  actionId: string,
): Promise<Result<{ removed: true }>> {
  const parsed = idSchema.safeParse(actionId);
  if (!parsed.success) return { success: false, error: "Ação inválida" };

  const auth = await authorizeWorksmartRow(
    "worksmart_actions",
    parsed.data,
    "Ação não encontrada",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.admin
    .from("worksmart_actions")
    .delete()
    .eq("id", parsed.data)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
  revalidateAtividades();
  return { success: true, data: { removed: true } };
}

export async function generateWorksmartCascade(
  raw: unknown,
): Promise<
  Result<{ keyResults: number; cards: number; boardId: string | null }>
> {
  const parsed = generateCascadeSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Objetivo inválido" };
  }

  const auth = await authorizeWorksmartRow(
    "worksmart_objectives",
    parsed.data.objectiveId,
    "Objetivo não encontrado",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin, access } = auth;

  const ownerId = resolveCascadeOwner(parsed.data.quemId, access.user.id);
  if (!ownerId) {
    return {
      success: false,
      error: "Escolha quem fica responsável pelos cards.",
    };
  }

  const { data: objective, error } = await admin
    .from("worksmart_objectives")
    .select(
      "id, title, smart_especifica, smart_mensuravel, smart_atingivel, smart_relevante, smart_temporal, worksmart_key_results ( id )",
    )
    .eq("id", parsed.data.objectiveId)
    .single();
  if (error || !objective) {
    return {
      success: false,
      error: error?.message ?? "Objetivo não encontrado",
    };
  }

  const source = {
    title: objective.title as string,
    smartEspecifica: (objective.smart_especifica as string | null) ?? null,
    smartMensuravel: (objective.smart_mensuravel as string | null) ?? null,
    smartAtingivel: (objective.smart_atingivel as string | null) ?? null,
    smartRelevante: (objective.smart_relevante as string | null) ?? null,
    smartTemporal: (objective.smart_temporal as string | null) ?? null,
  };

  const existingKrs = (
    (objective.worksmart_key_results ?? []) as { id: string }[]
  ).map((row) => row.id);

  let keyResultsCreated = 0;
  const krIds = [...existingKrs];
  if (krIds.length === 0) {
    for (const suggested of suggestKeyResults(source)) {
      const created = await createWorksmartKeyResult({
        objectiveId: parsed.data.objectiveId,
        title: suggested.title,
        targetValue: suggested.targetValue,
        currentValue: 0,
        unit: suggested.unit,
      });
      if (!created.success) return created;
      krIds.push(created.data.id);
      keyResultsCreated += 1;
    }
  }

  const suggested = suggestActions(source);
  let cardsCreated = 0;
  let boardId: string | null = null;
  for (const krId of krIds) {
    const { count } = await admin
      .from("worksmart_actions")
      .select("id", { count: "exact", head: true })
      .eq("key_result_id", krId);
    if ((count ?? 0) > 0) continue;
    for (const action of suggested) {
      const created = await createWorksmartAction({
        keyResultId: krId,
        oQue: action.oQue,
        quemId: ownerId,
        quando: action.quando,
        porQue: action.porQue,
        como: action.como,
        quanto: action.quanto,
      });
      if (!created.success) return created;
      cardsCreated += 1;
      boardId = created.data.boardId;
    }
  }

  revalidateAtividades();
  return {
    success: true,
    data: { keyResults: keyResultsCreated, cards: cardsCreated, boardId },
  };
}
