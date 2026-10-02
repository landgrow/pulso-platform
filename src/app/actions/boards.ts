"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeOrg, type OrgAccess } from "@/lib/auth/org-access";
import {
  BUILTIN_FIELDS,
  type Board,
  type BoardAutomation,
  type BoardCard,
  type CardFile,
  type Comentario,
  type CustomValue,
  type FieldConfig,
  type PropertyType,
  type Subtarefa,
} from "@/types/boards";
import { normalizeViewConfig, type BoardViewConfig } from "@/types/board-view";
import { createClientAccount } from "@/app/actions/admin";
import {
  dispatchCardEvent,
  loadCardEventContext,
  notifyClientCardChange,
} from "@/lib/notify/dispatch";
import {
  CRM_DEFAULT_COLUMNS,
  PLANO_DE_ACAO_COLUMNS,
  URGENCIA_PROPERTY,
  boardHasColumnLabel,
  defaultAtividadesFieldConfig,
} from "@/lib/boards/plano-de-acao-template";

type Result<T> = { success: true; data: T } | { success: false; error: string };
type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

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

const DEFAULT_COLUMNS = CRM_DEFAULT_COLUMNS;

const createCardSchema = z.object({
  boardId: z.string().uuid(),
  columnId: z.string().uuid(),
  titulo: z.string().min(1, "Título é obrigatório"),
  observacoes: z.string().nullable().optional(),
  sourceMeetingId: z.string().uuid().optional(),
  sourceChecklistItemId: z.string().uuid().optional(),
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

const idSchema = z.string().uuid();

const toggleAutomationSchema = z.object({
  automationId: z.string().uuid(),
  ativo: z.boolean(),
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
    related_org:organizations!board_cards_related_org_id_fkey ( name ),
    card_files ( id, name, mime_type, web_view_link, uploaded_by, created_at )
  )
`;

const BOARD_SELECT_NO_FILES = BOARD_SELECT.replace(
  ",\n    card_files ( id, name, mime_type, web_view_link, uploaded_by, created_at )",
  "",
);

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
    card_files?: CardFile[];
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
        arquivos: c.card_files ?? [],
        bloqueada_por: c.bloqueada_por,
        position: c.position,
        custom_values: c.custom_values ?? {},
      })),
  };
}

// ─── Autorização ─────────────────────────────────────────────────────────────

interface BoardRef {
  id: string;
  org_id: string;
  kind: "standard" | "admin_only";
  module: "atividades" | "crm";
}

type BoardAuth =
  | { ok: true; admin: AdminClient; access: OrgAccess; board: BoardRef }
  | { ok: false; error: string };

const BOARD_NOT_FOUND = "Kanban não encontrado";
const STAFF_ONLY = "Acesso restrito à equipe Land Grow";

/** Mesma regra do can_access_board: admin_only é só do platform_admin (consultor e cliente nunca veem). */
function canSeeAdminOnly(access: OrgAccess): boolean {
  return access.platformRole === "platform_admin";
}

function actorName(user: User): string {
  return (user.user_metadata?.full_name as string | undefined) ?? "Cliente";
}

/** Resolve a org dona do board (via admin) e autoriza o usuário nela. */
async function authorizeBoard(
  boardId: string,
  opts: { write?: boolean } = {},
): Promise<BoardAuth> {
  const admin = await createAdminClient();
  // "*" porque bancos sem a 0021 não têm a coluna kind.
  const { data } = await admin
    .from("boards")
    .select("*")
    .eq("id", boardId)
    .maybeSingle();
  const row = data as {
    id: string;
    org_id: string;
    kind?: string | null;
    module: "atividades" | "crm";
  } | null;
  if (!row?.org_id) return { ok: false, error: BOARD_NOT_FOUND };

  const auth = await authorizeOrg(row.org_id, opts);
  if (!auth.ok) return auth;

  const board: BoardRef = {
    id: row.id,
    org_id: row.org_id,
    kind: row.kind === "admin_only" ? "admin_only" : "standard",
    module: row.module,
  };
  if (board.kind === "admin_only" && !canSeeAdminOnly(auth.access)) {
    return { ok: false, error: BOARD_NOT_FOUND };
  }
  return { ok: true, admin, access: auth.access, board };
}

/** Acha o board_id de uma linha filha (card/coluna/propriedade/automação) e autoriza pelo board. */
async function authorizeBoardChild(
  table:
    "board_cards" | "board_columns" | "board_properties" | "board_automations",
  id: string,
  notFound: string,
  opts: { write?: boolean } = {},
): Promise<BoardAuth> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from(table)
    .select("board_id")
    .eq("id", id)
    .maybeSingle();
  const boardId = (data as { board_id: string | null } | null)?.board_id;
  if (!boardId) return { ok: false, error: notFound };
  const auth = await authorizeBoard(boardId, opts);
  if (!auth.ok && auth.error === BOARD_NOT_FOUND) {
    return { ok: false, error: notFound };
  }
  return auth;
}

function authorizeCardById(
  cardId: string,
  opts: { write?: boolean } = {},
): Promise<BoardAuth> {
  return authorizeBoardChild(
    "board_cards",
    cardId,
    "Card não encontrado",
    opts,
  );
}

async function columnBelongsToBoard(
  admin: AdminClient,
  columnId: string,
  boardId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("board_columns")
    .select("id")
    .eq("id", columnId)
    .eq("board_id", boardId)
    .maybeSingle();
  return Boolean(data);
}

/** Port do RPC get_or_create_default_board para o client admin (o RPC depende de auth.uid()). */
async function getOrCreateDefaultBoardId(
  admin: AdminClient,
  orgId: string,
  userId: string,
): Promise<{ id: string } | { error: string }> {
  const { data: existing, error: findError } = await admin
    .from("boards")
    .select("id")
    .eq("org_id", orgId)
    .eq("module", "atividades")
    .eq("kind", "standard")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (findError) return { error: findError.message };

  let boardId = (existing as { id: string } | null)?.id ?? null;
  if (!boardId) {
    const { data: created, error: createError } = await admin
      .from("boards")
      .insert({
        org_id: orgId,
        name: "Plano de Ação",
        module: "atividades",
        kind: "standard",
        created_by: userId,
        field_config: defaultAtividadesFieldConfig(),
      })
      .select("id")
      .single();
    if (createError || !created) {
      return { error: createError?.message ?? "Erro ao carregar board" };
    }
    boardId = created.id as string;

    const { error: colError } = await admin.from("board_columns").insert(
      PLANO_DE_ACAO_COLUMNS.map((c, i) => ({
        board_id: boardId,
        label: c.label,
        color: c.color,
        position: i,
      })),
    );
    if (colError) return { error: colError.message };

    await admin.from("board_properties").insert({
      board_id: boardId,
      key: URGENCIA_PROPERTY.key,
      label: URGENCIA_PROPERTY.label,
      type: URGENCIA_PROPERTY.type,
      options: URGENCIA_PROPERTY.options,
      position: 0,
      visible: true,
    });
  }

  const { data: org } = await admin
    .from("organizations")
    .select("is_internal")
    .eq("id", orgId)
    .maybeSingle();
  if ((org as { is_internal: boolean | null } | null)?.is_internal) {
    const { data: adminBoard } = await admin
      .from("boards")
      .select("id")
      .eq("org_id", orgId)
      .eq("kind", "admin_only")
      .eq("module", "atividades")
      .limit(1)
      .maybeSingle();
    if (!adminBoard) {
      const { data: createdAdmin } = await admin
        .from("boards")
        .insert({
          org_id: orgId,
          name: "Tarefas administrativas",
          module: "atividades",
          kind: "admin_only",
          icon: "🔒",
          color: "#64748B",
          position: 1000,
        })
        .select("id")
        .single();
      if (createdAdmin) {
        await admin.from("board_columns").insert(
          [
            { label: "A FAZER", color: "#94A3B8" },
            { label: "EM ANDAMENTO", color: "#6366F1" },
            { label: "REVISÃO INTERNA", color: "#EAB308" },
            { label: "Concluído", color: "#22C55E" },
          ].map((c, i) => ({
            board_id: createdAdmin.id as string,
            label: c.label,
            color: c.color,
            position: i,
          })),
        );
      }
    }
  }

  return { id: boardId };
}

async function fetchBoardById(
  admin: AdminClient,
  boardId: string,
): Promise<Result<Board>> {
  const first = await admin
    .from("boards")
    .select(BOARD_SELECT)
    .eq("id", boardId)
    .single();

  if (!first.error && first.data) {
    return {
      success: true,
      data: mapBoard(first.data as unknown as RawBoardRow),
    };
  }

  const fallback = await admin
    .from("boards")
    .select(BOARD_SELECT_NO_FILES)
    .eq("id", boardId)
    .single();

  if (fallback.error || !fallback.data) {
    return {
      success: false,
      error:
        first.error?.message ??
        fallback.error?.message ??
        "Board não encontrado",
    };
  }
  return {
    success: true,
    data: mapBoard(fallback.data as unknown as RawBoardRow),
  };
}

/** Board principal da org — cria com as 4 colunas padrão na primeira visita. */
export async function getBoard(orgId: string): Promise<Result<Board>> {
  const parsed = orgIdSchema.safeParse({ orgId });
  if (!parsed.success) return { success: false, error: "Organização inválida" };

  const auth = await authorizeOrg(parsed.data.orgId);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  const ensured = await getOrCreateDefaultBoardId(
    admin,
    parsed.data.orgId,
    auth.access.user.id,
  );
  if ("error" in ensured) return { success: false, error: ensured.error };

  return fetchBoardById(admin, ensured.id);
}

export async function getBoardById(boardId: string): Promise<Result<Board>> {
  const parsed = idSchema.safeParse(boardId);
  if (!parsed.success) return { success: false, error: "Kanban inválido" };

  const auth = await authorizeBoard(parsed.data);
  if (!auth.ok) return { success: false, error: auth.error };
  return fetchBoardById(auth.admin, auth.board.id);
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

  const auth = await authorizeOrg(parsed.data.orgId);
  if (!auth.ok) return { success: false, error: auth.error };
  const showAdminOnly = canSeeAdminOnly(auth.access);

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("boards")
    .select("id, name, icon, color, kind")
    .eq("org_id", parsed.data.orgId)
    .eq("module", parsed.data.module)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (error.message.toLowerCase().includes("kind")) {
      const fallback = await admin
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
    data: (
      (data ?? []) as {
        id: string;
        name: string;
        icon: string;
        color: string;
        kind: string | null;
      }[]
    )
      .map((row) => ({
        ...row,
        kind:
          row.kind === "admin_only"
            ? ("admin_only" as const)
            : ("standard" as const),
      }))
      .filter((row) => showAdminOnly || row.kind !== "admin_only"),
  };
}

/** Cria um novo kanban na org. Atividades já nasce com o modelo Plano de Ação. */
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

  const auth = await authorizeOrg(orgId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  const { count } = await admin
    .from("boards")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("module", module);

  const columns =
    module === "atividades" ? PLANO_DE_ACAO_COLUMNS : DEFAULT_COLUMNS;

  const { data: board, error: boardError } = await admin
    .from("boards")
    .insert({
      org_id: orgId,
      name,
      module,
      kind: "standard",
      position: count ?? 0,
      created_by: auth.access.user.id,
      field_config:
        module === "atividades" ? defaultAtividadesFieldConfig() : {},
    })
    .select("id")
    .single();

  if (boardError || !board)
    return {
      success: false,
      error: boardError?.message ?? "Erro ao criar kanban",
    };

  const { error: colError } = await admin.from("board_columns").insert(
    columns.map((c, i) => ({
      board_id: board.id,
      label: c.label,
      color: c.color,
      position: i,
    })),
  );

  if (colError) return { success: false, error: colError.message };

  if (module === "atividades") {
    await admin.from("board_properties").insert({
      board_id: board.id,
      key: URGENCIA_PROPERTY.key,
      label: URGENCIA_PROPERTY.label,
      type: URGENCIA_PROPERTY.type,
      options: URGENCIA_PROPERTY.options,
      position: 0,
      visible: true,
    });
  }

  revalidatePath(module === "crm" ? "/admin/crm" : "/admin/atividades");
  return { success: true, data: { id: board.id as string } };
}

/** Completa um kanban existente com as colunas e o campo Urgência do Plano de Ação. */
export async function applyPlanoDeAcaoTemplate(
  boardId: string,
): Promise<Result<{ addedColumns: number }>> {
  const parsed = idSchema.safeParse(boardId);
  if (!parsed.success) return { success: false, error: "Kanban inválido" };

  const auth = await authorizeBoard(parsed.data, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin, board } = auth;

  const { data: existingCols } = await admin
    .from("board_columns")
    .select("id, label, position")
    .eq("board_id", board.id)
    .order("position", { ascending: true });

  const labels = (existingCols ?? []).map((c: { label: string }) => c.label);
  const startPos = (existingCols ?? []).length;
  const missing = PLANO_DE_ACAO_COLUMNS.filter(
    (col) => !boardHasColumnLabel(labels, col.label),
  );

  if (missing.length > 0) {
    const { error: colError } = await admin.from("board_columns").insert(
      missing.map((c, i) => ({
        board_id: board.id,
        label: c.label,
        color: c.color,
        position: startPos + i,
      })),
    );
    if (colError) return { success: false, error: colError.message };
  }

  const { data: existingProps } = await admin
    .from("board_properties")
    .select("key")
    .eq("board_id", board.id);
  const hasUrgencia = (existingProps ?? []).some(
    (p: { key: string }) =>
      p.key === URGENCIA_PROPERTY.key || p.key.toLowerCase().includes("urgenc"),
  );
  if (!hasUrgencia) {
    await admin.from("board_properties").insert({
      board_id: board.id,
      key: URGENCIA_PROPERTY.key,
      label: URGENCIA_PROPERTY.label,
      type: URGENCIA_PROPERTY.type,
      options: URGENCIA_PROPERTY.options,
      position: (existingProps ?? []).length,
      visible: true,
    });
  }

  const { data: updated, error: updateError } = await admin
    .from("boards")
    .update({ field_config: defaultAtividadesFieldConfig() })
    .eq("id", board.id)
    .select("id");
  if (updateError) return { success: false, error: updateError.message };
  if (!updated || updated.length === 0)
    return { success: false, error: "Não encontrado" };

  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  revalidatePath("/configuracoes/operacao");
  return { success: true, data: { addedColumns: missing.length } };
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
  const auth = await authorizeBoard(parsed.data.boardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.admin
    .from("boards")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.boardId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
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

  const auth = await authorizeBoard(boardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };

  const patch: Record<string, string> = {};
  if (icon !== undefined) patch.icon = icon;
  if (color !== undefined) patch.color = color;
  if (Object.keys(patch).length === 0)
    return { success: true, data: { id: boardId } };

  const { data, error } = await auth.admin
    .from("boards")
    .update(patch)
    .eq("id", boardId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: boardId } };
}

export async function deleteBoard(
  boardId: string,
): Promise<Result<{ removed: true }>> {
  const parsed = idSchema.safeParse(boardId);
  if (!parsed.success) return { success: false, error: "Kanban inválido" };

  const auth = await authorizeBoard(parsed.data, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  if (auth.board.kind === "admin_only") {
    return {
      success: false,
      error:
        "O kanban de tarefas administrativas é fixo e não pode ser excluído.",
    };
  }
  // Mesma regra da RLS boards_delete: só platform_admin exclui kanban.
  if (auth.access.platformRole !== "platform_admin") {
    return {
      success: false,
      error: "Apenas administradores da plataforma podem excluir kanbans.",
    };
  }

  const { data, error } = await auth.admin
    .from("boards")
    .delete()
    .eq("id", parsed.data)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { removed: true } };
}

/** Se a coluna tiver uma automação ativa, aplica prioridade/responsável no card — avaliada de forma síncrona ao criar ou mover um card, sem cron nem webhook. */
async function applyAutomation(
  admin: AdminClient,
  columnId: string,
  cardId: string,
): Promise<void> {
  const { data: automation } = await admin
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
    await admin.from("board_cards").update(patch).eq("id", cardId);
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
  const {
    boardId,
    columnId,
    titulo,
    observacoes,
    sourceMeetingId,
    sourceChecklistItemId,
  } = parsed.data;

  const auth = await authorizeBoard(boardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin, access, board } = auth;

  if (!(await columnBelongsToBoard(admin, columnId, boardId))) {
    return { success: false, error: "Coluna não encontrada" };
  }
  if (sourceMeetingId) {
    const { data: meeting } = await admin
      .from("meetings")
      .select("org_id")
      .eq("id", sourceMeetingId)
      .maybeSingle();
    if ((meeting as { org_id: string } | null)?.org_id !== board.org_id) {
      return { success: false, error: "Reunião não encontrada" };
    }
  }

  const { count } = await admin
    .from("board_cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", columnId);

  const insert: Record<string, unknown> = {
    board_id: boardId,
    column_id: columnId,
    titulo,
    position: count ?? 0,
    created_by: access.user.id,
  };
  if (observacoes !== undefined) insert.observacoes = observacoes;
  if (sourceMeetingId) insert.source_meeting_id = sourceMeetingId;
  if (sourceChecklistItemId) {
    insert.source_checklist_item_id = sourceChecklistItemId;
  }

  const { data, error } = await admin
    .from("board_cards")
    .insert(insert)
    .select("id")
    .single();

  if (error || !data)
    return { success: false, error: error?.message ?? "Erro ao criar card" };
  const cardId = data.id as string;
  await applyAutomation(admin, columnId, cardId);
  void notifyClientCardChange(
    cardId,
    access.user.id,
    actorName(access.user),
    `criou o card "${titulo}"`,
  );
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: cardId } };
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

  const auth = await authorizeCardById(cardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin, access, board } = auth;

  // Cliente só vincula o card à própria org — o nome da org vinculada aparece no card.
  if (
    access.platformRole === null &&
    rest.relatedOrgId &&
    rest.relatedOrgId !== board.org_id
  ) {
    return { success: false, error: "Sem acesso a esta organização" };
  }

  const patch: Record<string, unknown> = {};
  if (rest.titulo !== undefined) patch.titulo = rest.titulo;
  if (rest.prioridade !== undefined) patch.prioridade = rest.prioridade;
  if (rest.responsavelId !== undefined)
    patch.responsavel_id = rest.responsavelId;
  if (rest.setor !== undefined) patch.setor = rest.setor;
  if (rest.prazo !== undefined) patch.prazo = rest.prazo || null;
  if (rest.relatedOrgId !== undefined) patch.related_org_id = rest.relatedOrgId;
  if (rest.observacoes !== undefined) patch.observacoes = rest.observacoes;
  if (Object.keys(patch).length === 0)
    return { success: true, data: { id: cardId } };

  const { data, error } = await admin
    .from("board_cards")
    .update(patch)
    .eq("id", cardId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
  void notifyClientCardChange(
    cardId,
    access.user.id,
    actorName(access.user),
    "atualizou o card",
  );
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: cardId } };
}

export async function deleteCard(
  cardId: string,
): Promise<Result<{ removed: true }>> {
  const parsed = idSchema.safeParse(cardId);
  if (!parsed.success) return { success: false, error: "Card inválido" };

  const auth = await authorizeCardById(parsed.data, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.admin
    .from("board_cards")
    .delete()
    .eq("id", parsed.data)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { removed: true } };
}

export async function moveCard(raw: unknown): Promise<Result<{ id: string }>> {
  const parsed = moveCardSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { cardId, columnId, position } = parsed.data;

  const auth = await authorizeCardById(cardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin, board } = auth;

  if (!(await columnBelongsToBoard(admin, columnId, board.id))) {
    return { success: false, error: "Coluna não encontrada" };
  }

  const { data, error } = await admin
    .from("board_cards")
    .update({ column_id: columnId, position })
    .eq("id", cardId)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
  await applyAutomation(admin, columnId, cardId);
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

  const auth = await authorizeBoard(boardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin } = auth;

  const { count } = await admin
    .from("board_columns")
    .select("id", { count: "exact", head: true })
    .eq("board_id", boardId);

  const { data, error } = await admin
    .from("board_columns")
    .insert({ board_id: boardId, label, color, position: count ?? 0 })
    .select("id")
    .single();

  if (error || !data)
    return { success: false, error: error?.message ?? "Erro ao criar coluna" };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: data.id as string } };
}

/** Alterna (ou adiciona/remove) uma sub-tarefa — lê, muta o array jsonb e regrava. */
export async function toggleSubtarefa(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = toggleSubtarefaSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { cardId, subtarefaId, texto, removeId } = parsed.data;

  const auth = await authorizeCardById(cardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin } = auth;

  const { data: card, error: fetchError } = await admin
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

  const { data, error } = await admin
    .from("board_cards")
    .update({ subtarefas })
    .eq("id", cardId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
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

  const auth = await authorizeCardById(cardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin, access } = auth;

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", access.user.id)
    .maybeSingle();
  const autorNome =
    (profile as { full_name: string | null } | null)?.full_name ?? null;

  const { data: card, error: fetchError } = await admin
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
      autor_id: access.user.id,
      autor_nome: autorNome ?? "—",
      texto,
      created_at: new Date().toISOString(),
    },
  ];

  const { data: updated, error } = await admin
    .from("board_cards")
    .update({ comentarios })
    .eq("id", cardId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!updated || updated.length === 0)
    return { success: false, error: "Não encontrado" };

  const ctx = await loadCardEventContext(cardId);
  if (ctx) {
    void dispatchCardEvent({
      ...ctx,
      actorId: access.user.id,
      actorName: autorNome ?? "Alguém",
      kind: "comentario",
      detail: texto,
      entityKey: comentarios[comentarios.length - 1]?.id ?? cardId,
    });
  }

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

  const auth = await authorizeBoard(boardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin } = auth;
  const key = `custom_${Date.now()}`;

  const { count } = await admin
    .from("board_properties")
    .select("id", { count: "exact", head: true })
    .eq("board_id", boardId);

  const { data, error } = await admin
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
  return {
    success: true,
    data: { id: data.id as string, key: data.key as string },
  };
}

export async function deleteProperty(
  propertyId: string,
): Promise<Result<{ removed: true }>> {
  const parsed = idSchema.safeParse(propertyId);
  if (!parsed.success) return { success: false, error: "Propriedade inválida" };

  const auth = await authorizeBoardChild(
    "board_properties",
    parsed.data,
    "Propriedade não encontrada",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.admin
    .from("board_properties")
    .delete()
    .eq("id", parsed.data)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
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

  const auth = await authorizeBoardChild(
    "board_properties",
    propertyId,
    "Propriedade não encontrada",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };

  const patch: Record<string, unknown> = {};
  if (rest.label !== undefined) patch.label = rest.label;
  if (rest.visible !== undefined) patch.visible = rest.visible;
  if (Object.keys(patch).length === 0)
    return { success: true, data: { id: propertyId } };

  const { data, error } = await auth.admin
    .from("board_properties")
    .update(patch)
    .eq("id", propertyId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: propertyId } };
}

/** Mostra/oculta um campo FIXO do card (título/status/prioridade/etc) — propriedades personalizadas usam updateProperty. */
export async function updateFieldVisibility(
  raw: unknown,
): Promise<Result<{ ok: true }>> {
  const parsed = updateFieldVisibilitySchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { boardId, fieldKey, visible } = parsed.data;

  const auth = await authorizeBoard(boardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin } = auth;

  const { data: boardRow, error: fetchError } = await admin
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

  const { data, error } = await admin
    .from("boards")
    .update({ field_config: config })
    .eq("id", boardId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
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

  const auth = await authorizeBoard(boardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin } = auth;

  const { data: boardRow, error: fetchError } = await admin
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
    admin
      .from("boards")
      .update({ field_config: config })
      .eq("id", boardId)
      .select("id"),
    ...customUpdates.map((u) =>
      admin
        .from("board_properties")
        .update({ position: u.position })
        .eq("board_id", boardId)
        .eq("key", u.key)
        .select("id"),
    ),
  ]);
  if (boardResult.error)
    return { success: false, error: boardResult.error.message };
  if (!boardResult.data || boardResult.data.length === 0)
    return { success: false, error: "Não encontrado" };
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
  const auth = await authorizeBoardChild(
    "board_columns",
    parsed.data.columnId,
    "Coluna não encontrada",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.admin
    .from("board_columns")
    .update({ label: parsed.data.label })
    .eq("id", parsed.data.columnId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: parsed.data.columnId } };
}

/** Só permite excluir coluna vazia — cards precisam ser movidos/excluídos antes. */
export async function deleteColumn(
  columnId: string,
): Promise<Result<{ removed: true }>> {
  const parsed = idSchema.safeParse(columnId);
  if (!parsed.success) return { success: false, error: "Coluna inválida" };

  const auth = await authorizeBoardChild(
    "board_columns",
    parsed.data,
    "Coluna não encontrada",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };
  // Mesma regra da RLS board_columns_delete: só platform_admin.
  if (auth.access.platformRole !== "platform_admin") {
    return {
      success: false,
      error: "Apenas administradores da plataforma podem excluir colunas.",
    };
  }
  const { admin } = auth;

  const { count } = await admin
    .from("board_cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", parsed.data);
  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: "Mova ou exclua os cards desta coluna antes de excluí-la.",
    };
  }

  const { data, error } = await admin
    .from("board_columns")
    .delete()
    .eq("id", parsed.data)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
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
  const { boardId, orderedIds } = parsed.data;

  const auth = await authorizeBoard(boardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin } = auth;

  const { data: cols, error: colsError } = await admin
    .from("board_columns")
    .select("id")
    .eq("board_id", boardId);
  if (colsError) return { success: false, error: colsError.message };
  const own = new Set(((cols ?? []) as { id: string }[]).map((c) => c.id));
  if (orderedIds.some((id) => !own.has(id))) {
    return { success: false, error: "Coluna não encontrada" };
  }

  const results = await Promise.all(
    orderedIds.map((id, position) =>
      admin
        .from("board_columns")
        .update({ position })
        .eq("id", id)
        .eq("board_id", boardId),
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
  const parsed = idSchema.safeParse(boardId);
  if (!parsed.success) return { success: false, error: "Kanban inválido" };

  const auth = await authorizeBoard(parsed.data);
  if (!auth.ok) return { success: false, error: auth.error };
  if (auth.access.platformRole === null)
    return { success: false, error: STAFF_ONLY };

  const { data, error } = await auth.admin
    .from("board_automations")
    .select(
      "id, board_id, column_id, set_prioridade, set_responsavel_id, ativo, responsavel:profiles!board_automations_set_responsavel_id_fkey ( full_name )",
    )
    .eq("board_id", parsed.data)
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

  const auth = await authorizeBoard(boardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  if (auth.access.platformRole === null)
    return { success: false, error: STAFF_ONLY };
  const { admin } = auth;

  if (!(await columnBelongsToBoard(admin, columnId, boardId))) {
    return { success: false, error: "Coluna não encontrada" };
  }

  const { data, error } = await admin
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
  return { success: true, data: { id: data.id as string } };
}

export async function toggleAutomation(
  automationId: string,
  ativo: boolean,
): Promise<Result<{ id: string }>> {
  const parsed = toggleAutomationSchema.safeParse({ automationId, ativo });
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const auth = await authorizeBoardChild(
    "board_automations",
    parsed.data.automationId,
    "Automação não encontrada",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };
  if (auth.access.platformRole === null)
    return { success: false, error: STAFF_ONLY };

  const { data, error } = await auth.admin
    .from("board_automations")
    .update({ ativo: parsed.data.ativo })
    .eq("id", parsed.data.automationId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { id: parsed.data.automationId } };
}

export async function deleteAutomation(
  automationId: string,
): Promise<Result<{ removed: true }>> {
  const parsed = idSchema.safeParse(automationId);
  if (!parsed.success) return { success: false, error: "Automação inválida" };

  const auth = await authorizeBoardChild(
    "board_automations",
    parsed.data,
    "Automação não encontrada",
    { write: true },
  );
  if (!auth.ok) return { success: false, error: auth.error };
  if (auth.access.platformRole === null)
    return { success: false, error: STAFF_ONLY };

  const { data, error } = await auth.admin
    .from("board_automations")
    .delete()
    .eq("id", parsed.data)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
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

  const auth = await authorizeBoard(boardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin, access } = auth;

  if (!(await columnBelongsToBoard(admin, columnId, boardId))) {
    return { success: false, error: "Coluna não encontrada" };
  }

  const { count } = await admin
    .from("board_cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", columnId);
  const base = count ?? 0;

  const { error } = await admin.from("board_cards").insert(
    titles.map((titulo, i) => ({
      board_id: boardId,
      column_id: columnId,
      titulo,
      position: base + i,
      created_by: access.user.id,
    })),
  );

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/crm");
  return { success: true, data: { count: titles.length } };
}

type DashboardCardRow = {
  column_id: string;
  prazo: string | null;
  setor: string | null;
  responsavel_id: string | null;
};

const DASHBOARD_PAGE = 1000;

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

  const auth = await authorizeOrg(parsed.data.orgId);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  let boardsQuery = admin
    .from("boards")
    .select("id")
    .eq("org_id", parsed.data.orgId)
    .eq("module", parsed.data.module);
  if (!canSeeAdminOnly(auth.access)) {
    boardsQuery = boardsQuery.neq("kind", "admin_only");
  }
  const { data: boards, error: boardsError } = await boardsQuery;
  if (boardsError) return { success: false, error: boardsError.message };
  const boardIds = ((boards ?? []) as { id: string }[]).map((b) => b.id);

  const empty = {
    total_cards: 0,
    concluidos: 0,
    atrasados: 0,
    por_setor: {},
    por_responsavel: {},
  };
  if (boardIds.length === 0) return { success: true, data: empty };

  // Paginado: o PostgREST corta em 1000 linhas por request.
  const cards: DashboardCardRow[] = [];
  for (let from = 0; ; from += DASHBOARD_PAGE) {
    const { data, error } = await admin
      .from("board_cards")
      .select("column_id, prazo, setor, responsavel_id")
      .in("board_id", boardIds)
      .order("id", { ascending: true })
      .range(from, from + DASHBOARD_PAGE - 1);
    if (error) return { success: false, error: error.message };
    const page = (data ?? []) as DashboardCardRow[];
    cards.push(...page);
    if (page.length < DASHBOARD_PAGE) break;
  }
  if (cards.length === 0) return { success: true, data: empty };

  const { data: columns, error: columnsError } = await admin
    .from("board_columns")
    .select("id, label")
    .in("board_id", boardIds);
  if (columnsError) return { success: false, error: columnsError.message };
  const labelById = new Map(
    ((columns ?? []) as { id: string; label: string }[]).map((c) => [
      c.id,
      c.label,
    ]),
  );

  const responsavelIds = [
    ...new Set(
      cards
        .map((c) => c.responsavel_id)
        .filter((id): id is string => id !== null),
    ),
  ];
  const nameById = new Map<string, string | null>();
  if (responsavelIds.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", responsavelIds);
    if (profilesError) return { success: false, error: profilesError.message };
    for (const p of (profiles ?? []) as {
      id: string;
      full_name: string | null;
    }[]) {
      nameById.set(p.id, p.full_name);
    }
  }

  // current_date do Postgres (UTC no Supabase).
  const today = new Date().toISOString().slice(0, 10);
  let concluidos = 0;
  let atrasados = 0;
  const porSetor: Record<string, number> = {};
  const porResponsavel: Record<string, number> = {};

  for (const card of cards) {
    // Mesmo INNER JOIN do RPC: card sem coluna existente não conta.
    const label = labelById.get(card.column_id);
    if (label === undefined) continue;
    if (/conclu/i.test(label)) concluidos += 1;
    if (
      card.prazo &&
      card.prazo.slice(0, 10) < today &&
      !/conclu|cancel/i.test(label)
    ) {
      atrasados += 1;
    }
    if (card.setor !== null) {
      porSetor[card.setor] = (porSetor[card.setor] ?? 0) + 1;
    }
    const nome =
      (card.responsavel_id ? nameById.get(card.responsavel_id) : null) ??
      "Sem responsável";
    porResponsavel[nome] = (porResponsavel[nome] ?? 0) + 1;
  }

  const total = cards.filter((c) => labelById.has(c.column_id)).length;

  return {
    success: true,
    data: {
      total_cards: total,
      concluidos,
      atrasados,
      por_setor: porSetor,
      por_responsavel: porResponsavel,
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

  const auth = await authorizeCardById(cardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin } = auth;

  const { data: card, error: fetchError } = await admin
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

  const { data, error } = await admin
    .from("board_cards")
    .update({ custom_values: customValues })
    .eq("id", cardId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
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

  const auth = await authorizeBoard(boardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin } = auth;

  const { data: boardRow, error: fetchError } = await admin
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

  const { data, error } = await admin
    .from("boards")
    .update({ view_config: next })
    .eq("id", boardId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
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

  const auth = await authorizeCardById(cardId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  if (auth.access.platformRole === null)
    return { success: false, error: STAFF_ONLY };
  const { admin } = auth;

  const { data: card, error: cardError } = await admin
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

  const { data: linked, error: updateError } = await admin
    .from("board_cards")
    .update({ related_org_id: result.orgId })
    .eq("id", cardId)
    .select("id");
  if (updateError || !linked || linked.length === 0) {
    return {
      success: false,
      error: `Cliente criado, mas falhou ao vincular o card: ${updateError?.message ?? "Não encontrado"}`,
    };
  }

  revalidatePath("/admin/crm");
  revalidatePath("/admin/clientes");
  return {
    success: true,
    data: { orgId: result.orgId, slug: result.slug, warnings: result.warnings },
  };
}
