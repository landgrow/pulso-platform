"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  BUILTIN_FIELDS,
  type Board,
  type BoardAutomation,
  type BoardCard,
  type Comentario,
  type CustomValue,
  type FieldConfig,
  type PropertyType,
  type Subtarefa,
} from "@/types/boards";
import { normalizeViewConfig, type BoardViewConfig } from "@/types/board-view";
import { createClientAccount } from "@/app/actions/admin";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const BUILTIN_FIELD_KEYS = BUILTIN_FIELDS.map((f) => f.key);

const orgIdSchema = z.object({
  orgId: z.string().uuid("Organização inválida"),
});

const createBoardSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório"),
  module: z.enum(["atividades", "crm"]).default("atividades"),
});

const listBoardsSchema = z.object({
  orgId: z.string().uuid(),
  module: z.enum(["atividades", "crm"]).default("atividades"),
});

const renameBoardSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório"),
});

const updateBoardAppearanceSchema = z.object({
  boardId: z.string().uuid(),
  icon: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
});

const DEFAULT_COLUMNS = [
  { label: "A Fazer", color: "#94A3B8" },
  { label: "Em Andamento", color: "#3B82F6" },
  { label: "Revisão", color: "#EAB308" },
  { label: "Concluído", color: "#22C55E" },
];

const createCardSchema = z.object({
  boardId: z.string().uuid(),
  columnId: z.string().uuid(),
  titulo: z.string().min(1, "Título é obrigatório"),
});

const updateCardSchema = z.object({
  cardId: z.string().uuid(),
  titulo: z.string().min(1).optional(),
  prioridade: z.enum(["alta", "media", "baixa"]).optional(),
  responsavelId: z.string().uuid().nullable().optional(),
  setor: z.string().nullable().optional(),
  prazo: z.string().nullable().optional(),
  relatedOrgId: z.string().uuid().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

const moveCardSchema = z.object({
  cardId: z.string().uuid(),
  columnId: z.string().uuid(),
  position: z.number().int().min(0),
});

const createColumnSchema = z.object({
  boardId: z.string().uuid(),
  label: z.string().min(1, "Nome da coluna é obrigatório"),
  color: z.string().default("#94A3B8"),
});

const toggleSubtarefaSchema = z.object({
  cardId: z.string().uuid(),
  subtarefaId: z.string().optional(),
  texto: z.string().optional(),
  removeId: z.string().optional(),
});

const addComentarioSchema = z.object({
  cardId: z.string().uuid(),
  texto: z.string().min(1, "Comentário não pode ser vazio"),
});

const createPropertySchema = z.object({
  boardId: z.string().uuid(),
  label: z.string().min(1, "Nome é obrigatório"),
  type: z.enum([
    "text",
    "number",
    "date",
    "select",
    "multiselect",
    "checkbox",
    "url",
    "email",
    "phone",
  ]),
  options: z.array(z.string()).optional(),
});

const updatePropertySchema = z.object({
  propertyId: z.string().uuid(),
  label: z.string().min(1).optional(),
  visible: z.boolean().optional(),
});

const renameColumnSchema = z.object({
  columnId: z.string().uuid(),
  label: z.string().min(1, "Nome é obrigatório"),
});

const reorderColumnsSchema = z.object({
  boardId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1),
});

const createAutomationSchema = z.object({
  boardId: z.string().uuid(),
  columnId: z.string().uuid(),
  setPrioridade: z.enum(["alta", "media", "baixa"]).nullable().optional(),
  setResponsavelId: z.string().uuid().nullable().optional(),
});

const bulkCreateCardsSchema = z.object({
  boardId: z.string().uuid(),
  columnId: z.string().uuid(),
  titles: z.array(z.string().min(1)).min(1),
});

const updateCardCustomValueSchema = z.object({
  cardId: z.string().uuid(),
  propertyKey: z.string().min(1),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null(),
  ]),
});

const updateFieldVisibilitySchema = z.object({
  boardId: z.string().uuid(),
  fieldKey: z.string().min(1),
  visible: z.boolean(),
});

const reorderFieldsSchema = z.object({
  boardId: z.string().uuid(),
  order: z
    .array(
      z.object({ kind: z.enum(["builtin", "custom"]), key: z.string().min(1) }),
    )
    .min(1),
});

const convertCardToClientSchema = z.object({
  cardId: z.string().uuid(),
  ownerEmail: z.string().email("Email inválido"),
});

const updateViewConfigSchema = z.object({
  boardId: z.string().uuid(),
  patch: z.object({
    filters: z.array(z.any()).optional(),
    sort: z.array(z.any()).optional(),
    groupBy: z.string().optional(),
    colorRules: z.array(z.any()).optional(),
  }),
});

const BOARD_SELECT = `
  id, org_id, name, module, kind, icon, color, field_config, view_config,
  board_columns ( id, label, color, position ),
  board_properties ( id, key, label, type, options, position, visible ),
  board_cards (
    id, column_id, titulo, prioridade, setor, prazo, observacoes,
    subtarefas, comentarios, bloqueada_por, position, custom_values,
    responsavel_id, related_org_id,
    responsavel:profiles!board_cards_responsavel_id_fkey ( full_name ),
    related_org:organizations!board_cards_related_org_id_fkey ( name )
  )
`;

interface RawBoardRow {
  id: string;
  org_id: string;
  name: string;
  module: "atividades" | "crm";
  kind: "standard" | "admin_only";
  icon: string;
  color: string;
  field_config: FieldConfig | null;
  view_config: Partial<BoardViewConfig> | null;
  board_columns: {
    id: string;
    label: string;
    color: string;
    position: number;
  }[];
  board_properties: Array<{
    id: string;
    key: string;
    label: string;
    type: PropertyType;
    options: string[];
    position: number;
    visible: boolean;
  }>;
  board_cards: Array<{
    id: string;
    column_id: string;
    titulo: string;
    prioridade: "alta" | "media" | "baixa";
    setor: string | null;
    prazo: string | null;
    observacoes: string | null;
    subtarefas: Subtarefa[];
    comentarios: Comentario[];
    bloqueada_por: string | null;
    position: number;
    custom_values: Record<string, CustomValue>;
    responsavel_id: string | null;
    related_org_id: string | null;
    responsavel: { full_name: string | null } | null;
    related_org: { name: string } | null;
  }>;
}

function mapBoard(row: RawBoardRow): Board {
  return {
    id: row.id,
    org_id: row.org_id,
    name: row.name,
    module: row.module,
    kind: row.kind ?? "standard",
    icon: row.icon,
    color: row.color,
    columns: [...row.board_columns].sort((a, b) => a.position - b.position),
    properties: [...(row.board_properties ?? [])].sort(
      (a, b) => a.position - b.position,
    ),
    field_config: row.field_config ?? {},
    view_config: normalizeViewConfig(row.view_config),
    cards: [...row.board_cards]
      .sort((a, b) => a.position - b.position)
      .map((c): BoardCard => ({
        id: c.id,
        column_id: c.column_id,
        titulo: c.titulo,
        prioridade: c.prioridade,
        responsavel_id: c.responsavel_id,
        responsavel_nome: c.responsavel?.full_name ?? null,
        setor: c.setor,
        prazo: c.prazo,
        related_org_id: c.related_org_id,
        related_org_name: c.related_org?.name ?? null,
        observacoes: c.observacoes,
        subtarefas: c.subtarefas ?? [],
        comentarios: c.comentarios ?? [],
        bloqueada_por: c.bloqueada_por,
        position: c.position,
        custom_values: c.custom_values ?? {},
      })),
  };
}

async function fetchBoardById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  boardId: string,
): Promise<Result<Board>> {
  const { data, error } = await supabase
    .from("boards")
    .select(BOARD_SELECT)
    .eq("id", boardId)
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Board não encontrado" };
  }
  return { success: true, data: mapBoard(data as unknown as RawBoardRow) };
}

/** Board principal da org — cria com as 4 colunas padrão na primeira visita. */
export async function getBoard(orgId: string): Promise<Result<Board>> {
  const parsed = orgIdSchema.safeParse({ orgId });
  if (!parsed.success) return { success: false, error: "Organização inválida" };

  const supabase = await createClient();

  const { data: boardId, error: rpcError } = await supabase.rpc(
    "get_or_create_default_board",
    { p_org_id: orgId },
  );
  if (rpcError || !boardId) {
    return {
      success: false,
      error: rpcError?.message ?? "Erro ao carregar board",
    };
  }

  return fetchBoardById(supabase, boardId);
}

export async function getBoardById(boardId: string): Promise<Result<Board>> {
  const supabase = await createClient();
  return fetchBoardById(supabase, boardId);
}

/** Lista todos os kanbans (boards) de um módulo da org — pra montar o seletor de vários kanbans. */
export async function listBoards(
  orgId: string,
  module: "atividades" | "crm" = "atividades",
): Promise<
  Result<
    {
      id: string;
      name: string;
      icon: string;
      color: string;
      kind: "standard" | "admin_only";
    }[]
  >
> {
  const parsed = listBoardsSchema.safeParse({ orgId, module });
  if (!parsed.success) return { success: false, error: "Organização inválida" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boards")
    .select("id, name, icon, color, kind")
    .eq("org_id", parsed.data.orgId)
    .eq("module", parsed.data.module)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (error.message.toLowerCase().includes("kind")) {
      const fallback = await supabase
        .from("boards")
        .select("id, name, icon, color")
        .eq("org_id", parsed.data.orgId)
        .eq("module", parsed.data.module)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (fallback.error)
        return { success: false, error: fallback.error.message };
      return {
        success: true,
        data: (fallback.data ?? []).map(
          (row: { id: string; name: string; icon: string; color: string }) => ({
            ...row,
            kind: "standard" as const,
          }),
        ),
      };
    }
    return { success: false, error: error.message };
  }
  return {
    success: true,
    data: (data ?? []).map(
      (row: {
        id: string;
        name: string;
        icon: string;
        color: string;
        kind: string | null;
      }) => ({
        ...row,
        kind:
          row.kind === "admin_only"
            ? ("admin_only" as const)
            : ("standard" as const),
      }),
    ),
  };
}

/** Cria um novo kanban na org (Atividades ou CRM), já com as 4 colunas padrão. */
export async function createBoard(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = createBoardSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { orgId, name, module } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count } = await supabase
    .from("boards")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("module", module);

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .insert({
      org_id: orgId,
      name,
      module,
      position: count ?? 0,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (boardError || !board)
    return {
      success: false,
      error: boardError?.message ?? "Erro ao criar kanban",
    };

  const { error: colError } = await supabase.from("board_columns").insert(
    DEFAULT_COLUMNS.map((c, i) => ({
      board_id: board.id,
      label: c.label,
      color: c.color,
      position: i,
    })),
  );

  if (colError) return { success: false, error: colError.message };

  revalidatePath(module === "crm" ? "/admin/crm" : "/admin/atividades");
  return { success: true, data: { id: board.id } };
}

export async function renameBoard(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = renameBoardSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("boards")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.boardId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: parsed.data.boardId } };
}

/** Ícone (emoji) e cor do kanban — mesmo "Ícone da base"/"Cor da capa" da aba Layout no protótipo. */
export async function updateBoardAppearance(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = updateBoardAppearanceSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { boardId, icon, color } = parsed.data;
  const patch: Record<string, string> = {};
  if (icon !== undefined) patch.icon = icon;
  if (color !== undefined) patch.color = color;
  if (Object.keys(patch).length === 0)
    return { success: true, data: { id: boardId } };

  const supabase = await createClient();
  const { error } = await supabase
    .from("boards")
    .update(patch)
    .eq("id", boardId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: boardId } };
}

export async function deleteBoard(
  boardId: string,
): Promise<Result<{ removed: true }>> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("boards")
    .select("kind")
    .eq("id", boardId)
    .maybeSingle();
  if (existing?.kind === "admin_only") {
    return {
      success: false,
      error:
        "O kanban de tarefas administrativas é fixo e não pode ser excluído.",
    };
  }
  const { error } = await supabase.from("boards").delete().eq("id", boardId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { removed: true } };
}

/** Se a coluna tiver uma automação ativa, aplica prioridade/responsável no card — avaliada de forma síncrona ao criar ou mover um card, sem cron nem webhook. */
async function applyAutomation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  columnId: string,
  cardId: string,
): Promise<void> {
  const { data: automation } = await supabase
    .from("board_automations")
    .select("set_prioridade, set_responsavel_id")
    .eq("column_id", columnId)
    .eq("ativo", true)
    .maybeSingle();
  if (!automation) return;

  const patch: Record<string, unknown> = {};
  if (automation.set_prioridade) patch.prioridade = automation.set_prioridade;
  if (automation.set_responsavel_id)
    patch.responsavel_id = automation.set_responsavel_id;
  if (Object.keys(patch).length > 0) {
    await supabase.from("board_cards").update(patch).eq("id", cardId);
  }
}

export async function createCard(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = createCardSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { boardId, columnId, titulo } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count } = await supabase
    .from("board_cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", columnId);

  const { data, error } = await supabase
    .from("board_cards")
    .insert({
      board_id: boardId,
      column_id: columnId,
      titulo,
      position: count ?? 0,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data)
    return { success: false, error: error?.message ?? "Erro ao criar card" };
  await applyAutomation(supabase, columnId, data.id);
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: data.id } };
}

export async function updateCard(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = updateCardSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { cardId, ...rest } = parsed.data;
  const supabase = await createClient();

  const patch: Record<string, unknown> = {};
  if (rest.titulo !== undefined) patch.titulo = rest.titulo;
  if (rest.prioridade !== undefined) patch.prioridade = rest.prioridade;
  if (rest.responsavelId !== undefined)
    patch.responsavel_id = rest.responsavelId;
  if (rest.setor !== undefined) patch.setor = rest.setor;
  if (rest.prazo !== undefined) patch.prazo = rest.prazo || null;
  if (rest.relatedOrgId !== undefined) patch.related_org_id = rest.relatedOrgId;
  if (rest.observacoes !== undefined) patch.observacoes = rest.observacoes;

  const { error } = await supabase
    .from("board_cards")
    .update(patch)
    .eq("id", cardId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: cardId } };
}

export async function deleteCard(
  cardId: string,
): Promise<Result<{ removed: true }>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("board_cards")
    .delete()
    .eq("id", cardId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { removed: true } };
}

export async function moveCard(raw: unknown): Promise<Result<{ id: string }>> {
  const parsed = moveCardSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { cardId, columnId, position } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("board_cards")
    .update({ column_id: columnId, position })
    .eq("id", cardId);

  if (error) return { success: false, error: error.message };
  await applyAutomation(supabase, columnId, cardId);
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: cardId } };
}

export async function createColumn(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = createColumnSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { boardId, label, color } = parsed.data;
  const supabase = await createClient();

  const { count } = await supabase
    .from("board_columns")
    .select("id", { count: "exact", head: true })
    .eq("board_id", boardId);

  const { data, error } = await supabase
    .from("board_columns")
    .insert({ board_id: boardId, label, color, position: count ?? 0 })
    .select("id")
    .single();

  if (error || !data)
    return { success: false, error: error?.message ?? "Erro ao criar coluna" };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: data.id } };
}

/** Alterna (ou adiciona/remove) uma sub-tarefa — lê, muta o array jsonb e regrava. */
export async function toggleSubtarefa(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = toggleSubtarefaSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { cardId, subtarefaId, texto, removeId } = parsed.data;
  const supabase = await createClient();

  const { data: card, error: fetchError } = await supabase
    .from("board_cards")
    .select("subtarefas")
    .eq("id", cardId)
    .single();
  if (fetchError || !card)
    return {
      success: false,
      error: fetchError?.message ?? "Card não encontrado",
    };

  let subtarefas = (card.subtarefas ?? []) as Subtarefa[];
  if (removeId) {
    subtarefas = subtarefas.filter((s) => s.id !== removeId);
  } else if (subtarefaId) {
    subtarefas = subtarefas.map((s) =>
      s.id === subtarefaId ? { ...s, done: !s.done } : s,
    );
  } else if (texto) {
    subtarefas = [...subtarefas, { id: randomUUID(), texto, done: false }];
  }

  const { error } = await supabase
    .from("board_cards")
    .update({ subtarefas })
    .eq("id", cardId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: cardId } };
}

export async function addComentario(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = addComentarioSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { cardId, texto } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: card, error: fetchError } = await supabase
    .from("board_cards")
    .select("comentarios")
    .eq("id", cardId)
    .single();
  if (fetchError || !card)
    return {
      success: false,
      error: fetchError?.message ?? "Card não encontrado",
    };

  const comentarios = [
    ...((card.comentarios ?? []) as Comentario[]),
    {
      id: randomUUID(),
      autor_id: user?.id ?? null,
      autor_nome: profile?.full_name ?? "—",
      texto,
      created_at: new Date().toISOString(),
    },
  ];

  const { error } = await supabase
    .from("board_cards")
    .update({ comentarios })
    .eq("id", cardId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: cardId } };
}

/** Cria uma propriedade personalizada no board — mesmo modelo do protótipo (PROP_TYPES). */
export async function createProperty(
  raw: unknown,
): Promise<Result<{ id: string; key: string }>> {
  const parsed = createPropertySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { boardId, label, type, options } = parsed.data;
  const supabase = await createClient();
  const key = `custom_${Date.now()}`;

  const { count } = await supabase
    .from("board_properties")
    .select("id", { count: "exact", head: true })
    .eq("board_id", boardId);

  const { data, error } = await supabase
    .from("board_properties")
    .insert({
      board_id: boardId,
      key,
      label,
      type,
      options:
        type === "select" || type === "multiselect" ? (options ?? []) : [],
      position: count ?? 0,
    })
    .select("id, key")
    .single();

  if (error || !data)
    return {
      success: false,
      error: error?.message ?? "Erro ao criar propriedade",
    };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: data.id, key: data.key } };
}

export async function deleteProperty(
  propertyId: string,
): Promise<Result<{ removed: true }>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("board_properties")
    .delete()
    .eq("id", propertyId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { removed: true } };
}

/** Renomeia ou alterna a visibilidade de uma propriedade personalizada. */
export async function updateProperty(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = updatePropertySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { propertyId, ...rest } = parsed.data;
  const supabase = await createClient();

  const patch: Record<string, unknown> = {};
  if (rest.label !== undefined) patch.label = rest.label;
  if (rest.visible !== undefined) patch.visible = rest.visible;

  const { error } = await supabase
    .from("board_properties")
    .update(patch)
    .eq("id", propertyId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: propertyId } };
}

/** Regrava a posição de todas as propriedades a partir da ordem recebida. */
/** Mostra/oculta um campo FIXO do card (título/status/prioridade/etc) — propriedades personalizadas usam updateProperty. */
export async function updateFieldVisibility(
  raw: unknown,
): Promise<Result<{ ok: true }>> {
  const parsed = updateFieldVisibilitySchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { boardId, fieldKey, visible } = parsed.data;
  const supabase = await createClient();

  const { data: boardRow, error: fetchError } = await supabase
    .from("boards")
    .select("field_config")
    .eq("id", boardId)
    .single();
  if (fetchError || !boardRow)
    return {
      success: false,
      error: fetchError?.message ?? "Board não encontrado",
    };

  const config = { ...((boardRow.field_config ?? {}) as FieldConfig) };
  const defaultPosition = BUILTIN_FIELD_KEYS.indexOf(fieldKey);
  config[fieldKey] = {
    position: config[fieldKey]?.position ?? defaultPosition,
    visible,
  };

  const { error } = await supabase
    .from("boards")
    .update({ field_config: config })
    .eq("id", boardId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { ok: true } };
}

/** Reordena a lista UNIFICADA de campos fixos + propriedades personalizadas — mesma lista arrastável do protótipo (state.properties). */
export async function reorderBoardFields(
  raw: unknown,
): Promise<Result<{ ok: true }>> {
  const parsed = reorderFieldsSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { boardId, order } = parsed.data;
  const supabase = await createClient();

  const { data: boardRow, error: fetchError } = await supabase
    .from("boards")
    .select("field_config")
    .eq("id", boardId)
    .single();
  if (fetchError || !boardRow)
    return {
      success: false,
      error: fetchError?.message ?? "Board não encontrado",
    };

  const config = { ...((boardRow.field_config ?? {}) as FieldConfig) };
  const customUpdates: { key: string; position: number }[] = [];

  order.forEach((item, position) => {
    if (item.kind === "builtin") {
      config[item.key] = {
        visible: config[item.key]?.visible ?? true,
        position,
      };
    } else {
      customUpdates.push({ key: item.key, position });
    }
  });

  const [boardResult, ...propResults] = await Promise.all([
    supabase.from("boards").update({ field_config: config }).eq("id", boardId),
    ...customUpdates.map((u) =>
      supabase
        .from("board_properties")
        .update({ position: u.position })
        .eq("board_id", boardId)
        .eq("key", u.key),
    ),
  ]);
  if (boardResult.error)
    return { success: false, error: boardResult.error.message };
  const failed = propResults.find((r) => r.error);
  if (failed?.error) return { success: false, error: failed.error.message };

  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { ok: true } };
}

export async function renameColumn(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = renameColumnSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("board_columns")
    .update({ label: parsed.data.label })
    .eq("id", parsed.data.columnId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: parsed.data.columnId } };
}

/** Só permite excluir coluna vazia — cards precisam ser movidos/excluídos antes. */
export async function deleteColumn(
  columnId: string,
): Promise<Result<{ removed: true }>> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("board_cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", columnId);
  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: "Mova ou exclua os cards desta coluna antes de excluí-la.",
    };
  }

  const { error } = await supabase
    .from("board_columns")
    .delete()
    .eq("id", columnId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { removed: true } };
}

/** Regrava a posição de todas as colunas a partir da ordem recebida. */
export async function reorderColumns(
  raw: unknown,
): Promise<Result<{ ok: true }>> {
  const parsed = reorderColumnsSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { orderedIds } = parsed.data;
  const supabase = await createClient();

  const results = await Promise.all(
    orderedIds.map((id, position) =>
      supabase.from("board_columns").update({ position }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { success: false, error: failed.error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { ok: true } };
}

/** Lista as regras de automação de um board (uma por coluna, no máximo). */
export async function listAutomations(
  boardId: string,
): Promise<Result<BoardAutomation[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("board_automations")
    .select(
      "id, board_id, column_id, set_prioridade, set_responsavel_id, ativo, responsavel:profiles!board_automations_set_responsavel_id_fkey ( full_name )",
    )
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    board_id: string;
    column_id: string;
    set_prioridade: BoardAutomation["set_prioridade"];
    set_responsavel_id: string | null;
    ativo: boolean;
    responsavel: { full_name: string | null } | null;
  }>;
  return {
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      board_id: r.board_id,
      column_id: r.column_id,
      set_prioridade: r.set_prioridade,
      set_responsavel_id: r.set_responsavel_id,
      set_responsavel_nome: r.responsavel?.full_name ?? null,
      ativo: r.ativo,
    })),
  };
}

/** Cria uma regra "ao entrar nesta coluna, define prioridade/responsável". */
export async function createAutomation(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = createAutomationSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { boardId, columnId, setPrioridade, setResponsavelId } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("board_automations")
    .insert({
      board_id: boardId,
      column_id: columnId,
      set_prioridade: setPrioridade ?? null,
      set_responsavel_id: setResponsavelId ?? null,
    })
    .select("id")
    .single();

  if (error || !data)
    return {
      success: false,
      error: error?.message ?? "Erro ao criar automação",
    };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: data.id } };
}

export async function toggleAutomation(
  automationId: string,
  ativo: boolean,
): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("board_automations")
    .update({ ativo })
    .eq("id", automationId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: automationId } };
}

export async function deleteAutomation(
  automationId: string,
): Promise<Result<{ removed: true }>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("board_automations")
    .delete()
    .eq("id", automationId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { removed: true } };
}

/** Cria vários cards de uma vez, uma linha por título — usado pelo importador de dados. */
export async function bulkCreateCards(
  raw: unknown,
): Promise<Result<{ count: number }>> {
  const parsed = bulkCreateCardsSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { boardId, columnId, titles } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count } = await supabase
    .from("board_cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", columnId);
  const base = count ?? 0;

  const { error } = await supabase.from("board_cards").insert(
    titles.map((titulo, i) => ({
      board_id: boardId,
      column_id: columnId,
      titulo,
      position: base + i,
      created_by: user?.id ?? null,
    })),
  );

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { count: titles.length } };
}

/** Resumo agregado dos cards de um módulo (Atividades ou CRM) da org (total, concluídos, atrasados, por setor, por responsável). */
export async function getAtividadesDashboard(
  orgId: string,
  module: "atividades" | "crm" = "atividades",
): Promise<
  Result<{
    total_cards: number;
    concluidos: number;
    atrasados: number;
    por_setor: Record<string, number>;
    por_responsavel: Record<string, number>;
  }>
> {
  const parsed = listBoardsSchema.safeParse({ orgId, module });
  if (!parsed.success) return { success: false, error: "Organização inválida" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_atividades_dashboard", {
    p_org_id: parsed.data.orgId,
    p_module: parsed.data.module,
  });
  if (error) return { success: false, error: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { success: false, error: "Erro ao carregar dashboard" };

  return {
    success: true,
    data: {
      total_cards: Number(row.total_cards ?? 0),
      concluidos: Number(row.concluidos ?? 0),
      atrasados: Number(row.atrasados ?? 0),
      por_setor: (row.por_setor ?? {}) as Record<string, number>,
      por_responsavel: (row.por_responsavel ?? {}) as Record<string, number>,
    },
  };
}

/** Grava o valor de uma propriedade personalizada num card (merge no jsonb). */
export async function updateCardCustomValue(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = updateCardCustomValueSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { cardId, propertyKey, value } = parsed.data;
  const supabase = await createClient();

  const { data: card, error: fetchError } = await supabase
    .from("board_cards")
    .select("custom_values")
    .eq("id", cardId)
    .single();
  if (fetchError || !card)
    return {
      success: false,
      error: fetchError?.message ?? "Card não encontrado",
    };

  const customValues = {
    ...((card.custom_values ?? {}) as Record<string, CustomValue>),
    [propertyKey]: value,
  };

  const { error } = await supabase
    .from("board_cards")
    .update({ custom_values: customValues })
    .eq("id", cardId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: cardId } };
}

/** Atualiza filtros/ordenação/agrupamento/regras de cor do board (merge parcial no jsonb). */
export async function updateBoardViewConfig(
  raw: unknown,
): Promise<Result<{ ok: true }>> {
  const parsed = updateViewConfigSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { boardId, patch } = parsed.data;
  const supabase = await createClient();

  const { data: boardRow, error: fetchError } = await supabase
    .from("boards")
    .select("view_config")
    .eq("id", boardId)
    .single();
  if (fetchError || !boardRow)
    return {
      success: false,
      error: fetchError?.message ?? "Board não encontrado",
    };

  const current = normalizeViewConfig(
    boardRow.view_config as Partial<BoardViewConfig> | null,
  );
  const next: BoardViewConfig = { ...current, ...patch } as BoardViewConfig;

  const { error } = await supabase
    .from("boards")
    .update({ view_config: next })
    .eq("id", boardId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { ok: true } };
}

/** Converte um card de CRM (lead/parceiro) num cliente real — cria o acesso e vincula o card via related_org_id. */
export async function convertCardToClient(
  raw: unknown,
): Promise<Result<{ orgId: string; slug: string; warnings: string[] }>> {
  const parsed = convertCardToClientSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { cardId, ownerEmail } = parsed.data;
  const supabase = await createClient();

  const { data: card, error: cardError } = await supabase
    .from("board_cards")
    .select("titulo")
    .eq("id", cardId)
    .single();
  if (cardError || !card)
    return {
      success: false,
      error: cardError?.message ?? "Card não encontrado",
    };

  const result = await createClientAccount({
    name: card.titulo,
    email: ownerEmail,
    organizationName: card.titulo,
    additionalMembers: [],
  });
  if (!result.success) return { success: false, error: result.error };

  const { error: updateError } = await supabase
    .from("board_cards")
    .update({ related_org_id: result.orgId })
    .eq("id", cardId);
  if (updateError) {
    return {
      success: false,
      error: `Cliente criado, mas falhou ao vincular o card: ${updateError.message}`,
    };
  }

  revalidatePath("/admin/crm");
  revalidatePath("/admin/clientes");
  return {
    success: true,
    data: { orgId: result.orgId, slug: result.slug, warnings: result.warnings },
  };
}
