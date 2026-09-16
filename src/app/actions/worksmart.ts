"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isClosedColumnLabel } from "@/lib/boards/plano-de-acao-template";
import {
  derivedObjectiveStatus,
  toNumber,
  type SmartFields,
} from "@/lib/worksmart/cascade";
import { promoteWorksmartAction } from "@/lib/worksmart/promote-action";
import type {
  WorksmartAction,
  WorksmartKeyResult,
  WorksmartObjective,
  WorksmartStatus,
} from "@/types/worksmart";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const orgIdSchema = z.object({
  orgId: z.string().uuid("Organização inválida"),
});

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
}

export async function listWorksmartObjectives(
  orgId: string,
): Promise<Result<WorksmartObjective[]>> {
  const parsed = orgIdSchema.safeParse({ orgId });
  if (!parsed.success) return { success: false, error: "Organização inválida" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worksmart_objectives")
    .select(OBJECTIVE_SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: ((data ?? []) as ObjectiveRow[]).map(mapObjective),
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const status = derivedObjectiveStatus(smartFromInput(input), "rascunho");
  const { data, error } = await supabase
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
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Erro ao criar objetivo",
    };
  }
  revalidateAtividades();
  return { success: true, data: { id: data.id } };
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
  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
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

  const { error } = await supabase
    .from("worksmart_objectives")
    .update(patch)
    .eq("id", objectiveId);
  if (error) return { success: false, error: error.message };
  revalidateAtividades();
  return { success: true, data: { id: objectiveId } };
}

export async function deleteWorksmartObjective(
  objectiveId: string,
): Promise<Result<{ removed: true }>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("worksmart_objectives")
    .delete()
    .eq("id", objectiveId);
  if (error) return { success: false, error: error.message };
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
  const supabase = await createClient();

  const { data: objective } = await supabase
    .from("worksmart_objectives")
    .select("id, org_id")
    .eq("id", input.objectiveId)
    .single();
  if (!objective) return { success: false, error: "Objetivo não encontrado" };

  const { data: last } = await supabase
    .from("worksmart_key_results")
    .select("position")
    .eq("objective_id", input.objectiveId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("worksmart_key_results")
    .insert({
      objective_id: input.objectiveId,
      org_id: objective.org_id,
      title: input.title,
      target_value: input.targetValue ?? null,
      current_value: input.currentValue ?? 0,
      unit: input.unit,
      position: (last?.position ?? -1) + 1,
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
  return { success: true, data: { id: data.id } };
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
  const patch: Record<string, unknown> = {};
  if (rest.title !== undefined) patch.title = rest.title;
  if (rest.targetValue !== undefined) patch.target_value = rest.targetValue;
  if (rest.currentValue !== undefined) patch.current_value = rest.currentValue;
  if (rest.unit !== undefined) patch.unit = rest.unit;
  if (Object.keys(patch).length === 0) {
    return { success: true, data: { id: keyResultId } };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("worksmart_key_results")
    .update(patch)
    .eq("id", keyResultId);
  if (error) return { success: false, error: error.message };
  revalidateAtividades();
  return { success: true, data: { id: keyResultId } };
}

export async function deleteWorksmartKeyResult(
  keyResultId: string,
): Promise<Result<{ removed: true }>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("worksmart_key_results")
    .delete()
    .eq("id", keyResultId);
  if (error) return { success: false, error: error.message };
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: kr } = await supabase
    .from("worksmart_key_results")
    .select("id, org_id, objective_id")
    .eq("id", input.keyResultId)
    .single();
  if (!kr) return { success: false, error: "Key result não encontrado" };

  const { data: objective } = await supabase
    .from("worksmart_objectives")
    .select("setor")
    .eq("id", kr.objective_id)
    .maybeSingle();

  const { data: quem } = input.quemId
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", input.quemId)
        .maybeSingle()
    : { data: null };

  const { data: action, error } = await supabase
    .from("worksmart_actions")
    .insert({
      key_result_id: input.keyResultId,
      org_id: kr.org_id,
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

  const promoted = await promoteWorksmartAction(supabase, {
    actionId: action.id,
    orgId: kr.org_id,
    fields: {
      oQue: input.oQue,
      quem: quem?.full_name ?? null,
      quando: input.quando ?? null,
      onde: input.onde ?? null,
      porQue: input.porQue ?? null,
      como: input.como ?? null,
      quanto: input.quanto ?? null,
    },
    quemId: input.quemId ?? null,
    quando: input.quando ?? null,
    setor: objective?.setor ?? null,
    createdBy: user?.id ?? null,
  });

  if ("error" in promoted) {
    await supabase.from("worksmart_actions").delete().eq("id", action.id);
    return { success: false, error: promoted.error };
  }

  revalidateAtividades();
  return {
    success: true,
    data: { id: action.id, boardId: promoted.boardId },
  };
}

export async function deleteWorksmartAction(
  actionId: string,
): Promise<Result<{ removed: true }>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("worksmart_actions")
    .delete()
    .eq("id", actionId);
  if (error) return { success: false, error: error.message };
  revalidateAtividades();
  return { success: true, data: { removed: true } };
}
