"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type {
  PeriodoDados,
  PeriodSummary,
  PeriodDetail,
  Colecao,
  Evidencia,
  Result,
  ErrorCode,
} from "@/types/collections";
import type { MembershipRole } from "@/types/organization";
import { requireOrganization } from "@/lib/supabase/organization-server";
import { isPlatformAdmin } from "@/lib/supabase/platform-role-server";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createPeriodSchema = z.object({
  mes: z
    .number()
    .int()
    .min(1, "Mês deve ser entre 1 e 12")
    .max(12, "Mês deve ser entre 1 e 12"),
  ano: z
    .number()
    .int()
    .min(2024, "Ano deve ser >= 2024")
    .max(2100, "Ano inválido"),
});

const updatePeriodDataSchema = z.object({
  periodId: z.string().uuid("ID de período inválido"),
  // Payload parcial — campos opcionais permitem merge
  status: z
    .enum(["em_coleta", "pronto_para_analise", "analisado", "fechado"])
    .optional(),
});

const listPeriodsSchema = z.object({
  orgId: z.string().uuid("ID de organização inválido"),
});

const periodIdSchema = z.object({
  periodId: z.string().uuid("ID de período inválido"),
});

// ─── Helpers internos ────────────────────────────────────────────────────────

function fail<T>(error: string, code: ErrorCode): Result<T> {
  return { success: false, error, code };
}

function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Insere uma entrada no audit_log para ações sensíveis.
 * Falha silenciosa se a tabela não tiver policy permissiva.
 */
async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: {
    orgId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.from("audit_log").insert({
      org_id: args.orgId,
      action: args.action,
      resource_type: args.resourceType,
      resource_id: args.resourceId,
      metadata: args.metadata ?? {},
    });
  } catch (err) {
    // Não bloqueia a operação principal
    console.error("[audit] Falha ao registrar:", err);
  }
}

// ─── AC-1: createPeriod ─────────────────────────────────────────────────────

export type CreatePeriodResult = Result<{ periodId: string; created: boolean }>;

/**
 * Cria (ou retorna) o período (mes, ano) do cliente da org ativa.
 * Idempotente — múltiplas chamadas com o mesmo (mes, ano) retornam o mesmo ID.
 */
export async function createPeriod(raw: unknown): Promise<CreatePeriodResult> {
  const parsed = createPeriodSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const { mes, ano } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  // Pega org ativa via cookie + helper existente
  const orgCtx = await requireOrganization().catch(() => null);
  if (!orgCtx) return fail("Nenhuma organização ativa", "PERMISSION_DENIED");
  const orgId = orgCtx.org.id;

  // Pega o cliente da org (1:1)
  const { data: cliente, error: cliError } = await supabase
    .from("clientes")
    .select("id")
    .eq("org_id", orgId)
    .single();

  if (cliError || !cliente) {
    return fail("Cliente não encontrado para esta organização", "NOT_FOUND");
  }

  // Verifica se já existe período (idempotência)
  const { data: existing } = await supabase
    .from("periodos_dados")
    .select("id")
    .eq("cliente_id", cliente.id)
    .eq("mes", mes)
    .eq("ano", ano)
    .maybeSingle();

  if (existing) {
    return ok({ periodId: existing.id, created: false });
  }

  // Cria o período
  const { data: created, error: insertError } = await supabase
    .from("periodos_dados")
    .insert({
      cliente_id: cliente.id,
      mes,
      ano,
      status: "em_coleta",
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return fail(
      `Erro ao criar período: ${insertError?.message ?? "desconhecido"}`,
      "INTERNAL_ERROR",
    );
  }

  await logAudit(supabase, {
    orgId,
    action: "create",
    resourceType: "periodo_dados",
    resourceId: created.id,
    metadata: { mes, ano, status: "em_coleta" },
  });

  return ok({ periodId: created.id, created: true });
}

// ─── AC-2: getOrCreateCurrentPeriod ─────────────────────────────────────────

/**
 * Cria (ou retorna) o período do mês/ano atual para a org ativa.
 */
export async function getOrCreateCurrentPeriod(): Promise<CreatePeriodResult> {
  const now = new Date();
  return createPeriod({
    mes: now.getMonth() + 1,
    ano: now.getFullYear(),
  });
}

// ─── AC-3: listPeriods ──────────────────────────────────────────────────────

export type ListPeriodsResult = Result<{ periods: PeriodSummary[] }>;

/**
 * Lista períodos de uma organização, ordenado por ano/mes decrescente.
 */
export async function listPeriods(raw: unknown): Promise<ListPeriodsResult> {
  const parsed = listPeriodsSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const { orgId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  // Chama a função SQL helper
  const { data, error } = await supabase.rpc("list_periods_for_org", {
    p_org_id: orgId,
  });

  if (error) {
    return fail(`Erro ao listar períodos: ${error.message}`, "INTERNAL_ERROR");
  }

  // A função SQL retorna BIGINT como string em alguns drivers
  const periods: PeriodSummary[] = (
    (data ?? []) as Array<{
      id: string;
      mes: number;
      ano: number;
      status: PeriodoDados["status"];
      closed_at: string | null;
      created_at: string;
      colecoes_count: number | string;
      evidencias_count: number | string;
    }>
  ).map((row) => ({
    id: row.id,
    mes: row.mes,
    ano: row.ano,
    status: row.status,
    closed_at: row.closed_at,
    created_at: row.created_at,
    colecoes_count: Number(row.colecoes_count),
    evidencias_count: Number(row.evidencias_count),
  }));

  return ok({ periods });
}

// ─── AC-4: getPeriod ────────────────────────────────────────────────────────

export type GetPeriodResult = Result<{ period: PeriodDetail }>;

/**
 * Busca um período com todas as suas coleções e evidências.
 * Retorna também flags de permissão (canEdit, canDelete, role).
 */
export async function getPeriod(raw: unknown): Promise<GetPeriodResult> {
  const parsed = periodIdSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const { periodId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  // Pega o período (RLS filtra se não for da org do user)
  const { data: periodo, error: pError } = await supabase
    .from("periodos_dados")
    .select("*")
    .eq("id", periodId)
    .single();

  if (pError || !periodo) {
    return fail("Período não encontrado", "NOT_FOUND");
  }

  // Pega org_id via cliente (para checar role)
  const { data: cliente } = await supabase
    .from("clientes")
    .select("org_id")
    .eq("id", periodo.cliente_id)
    .single();

  if (!cliente) {
    return fail("Cliente do período não encontrado", "NOT_FOUND");
  }

  // Pega role do user na org
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", cliente.org_id)
    .maybeSingle();

  const role: MembershipRole | null = membership?.role ?? null;

  // Pega coleções e evidências em paralelo
  const [{ data: colecoes }, { data: evidencias }] = await Promise.all([
    supabase
      .from("colecoes")
      .select("*")
      .eq("periodo_id", periodId)
      .order("created_at", { ascending: true }),
    supabase
      .from("evidencias")
      .select("*")
      .eq("periodo_id", periodId)
      .order("created_at", { ascending: true }),
  ]);

  // Permissões
  const isClosed =
    periodo.status === "fechado" || periodo.status === "analisado";
  const canEdit = !isClosed && role !== null && role !== "client_viewer";
  const canDelete = role === "client_owner";

  const period: PeriodDetail = {
    periodo: periodo as PeriodoDados,
    colecoes: (colecoes ?? []) as Colecao[],
    evidencias: (evidencias ?? []) as Evidencia[],
    canEdit,
    canDelete,
    role,
  };

  return ok({ period });
}

// ─── AC-5: updatePeriodData ─────────────────────────────────────────────────

/**
 * Atualiza dados parciais de um período (atualmente apenas status).
 * Recusa se o período estiver fechado.
 */
export async function updatePeriodData(
  raw: unknown,
): Promise<Result<{ periodId: string; status: PeriodoDados["status"] }>> {
  const parsed = updatePeriodDataSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const { periodId, status } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  // Verifica status atual
  const { data: current, error: fetchError } = await supabase
    .from("periodos_dados")
    .select("id, status, cliente_id, clientes!inner(org_id)")
    .eq("id", periodId)
    .single();

  if (fetchError || !current) {
    return fail("Período não encontrado", "NOT_FOUND");
  }

  // Join dinâmico do Supabase — type cast explícito
  const clienteJoin = current.clientes as
    { org_id: string } | { org_id: string }[] | null;
  const orgId: string | undefined = Array.isArray(clienteJoin)
    ? clienteJoin[0]?.org_id
    : clienteJoin?.org_id;
  if (!orgId) {
    return fail("Organização do período não encontrada", "NOT_FOUND");
  }

  // Verifica role mínima (client_member)
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!membership)
    return fail("Sem permissão nesta organização", "PERMISSION_DENIED");
  if (membership.role === "client_viewer") {
    return fail(
      "Sem permissão (client_viewer é somente leitura)",
      "PERMISSION_DENIED",
    );
  }

  // Recusa se fechado
  if (current.status === "fechado") {
    return fail("Período está fechado", "PERIOD_CLOSED");
  }

  // Aplica update
  const updatePayload: Record<string, unknown> = {};
  if (status) updatePayload.status = status;
  if (Object.keys(updatePayload).length === 0) {
    return fail("Nenhum campo para atualizar", "INVALID_INPUT");
  }

  const { data: updated, error: updateError } = await supabase
    .from("periodos_dados")
    .update(updatePayload)
    .eq("id", periodId)
    .select("id, status")
    .single();

  if (updateError || !updated) {
    return fail(
      `Erro ao atualizar: ${updateError?.message ?? "desconhecido"}`,
      "INTERNAL_ERROR",
    );
  }

  await logAudit(supabase, {
    orgId,
    action: "update",
    resourceType: "periodo_dados",
    resourceId: periodId,
    metadata: { changes: updatePayload },
  });

  return ok({ periodId, status: updated.status as PeriodoDados["status"] });
}

// ─── AC-6: closePeriod ──────────────────────────────────────────────────────

/**
 * Fecha um período — seta status = 'fechado' e closed_at = now().
 * Idempotente. Requer client_owner ou platform_admin.
 */
export async function closePeriod(
  raw: unknown,
): Promise<
  Result<{ periodId: string; status: PeriodoDados["status"]; closedAt: string }>
> {
  const parsed = periodIdSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const { periodId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  // Busca período + org via join
  const { data: current, error: fetchError } = await supabase
    .from("periodos_dados")
    .select("id, status, cliente_id, clientes!inner(org_id)")
    .eq("id", periodId)
    .single();

  if (fetchError || !current) {
    return fail("Período não encontrado", "NOT_FOUND");
  }

  // Join dinâmico do Supabase — type cast explícito
  const clienteJoin = current.clientes as
    { org_id: string } | { org_id: string }[] | null;
  const orgId: string | undefined = Array.isArray(clienteJoin)
    ? clienteJoin[0]?.org_id
    : clienteJoin?.org_id;
  if (!orgId) {
    return fail("Organização do período não encontrada", "NOT_FOUND");
  }

  // Verifica permissão: client_owner ou platform_admin
  const isAdmin = await isPlatformAdmin(supabase);

  if (!isAdmin) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (membership?.role !== "client_owner") {
      return fail(
        "Apenas client_owner ou platform_admin podem fechar período",
        "PERMISSION_DENIED",
      );
    }
  }

  // Idempotência
  if (current.status === "fechado") {
    // Já está fechado — retorna o closed_at existente
    const { data: existing } = await supabase
      .from("periodos_dados")
      .select("closed_at")
      .eq("id", periodId)
      .single();

    return ok({
      periodId,
      status: "fechado",
      closedAt: existing?.closed_at ?? new Date().toISOString(),
    });
  }

  // Pré-condição: status deve ser em_coleta ou pronto_para_analise
  if (
    current.status !== "em_coleta" &&
    current.status !== "pronto_para_analise"
  ) {
    return fail(
      `Não é possível fechar período com status '${current.status}'`,
      "INVALID_INPUT",
    );
  }

  // Conta coleções e evidências para o audit
  const [{ count: colecoesCount }, { count: evidenciasCount }] =
    await Promise.all([
      supabase
        .from("colecoes")
        .select("*", { count: "exact", head: true })
        .eq("periodo_id", periodId)
        .neq("status", "descartado"),
      supabase
        .from("evidencias")
        .select("*", { count: "exact", head: true })
        .eq("periodo_id", periodId),
    ]);

  // Fecha
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("periodos_dados")
    .update({
      status: "fechado",
      closed_at: now,
    })
    .eq("id", periodId)
    .select("id, status, closed_at")
    .single();

  if (updateError || !updated) {
    return fail(
      `Erro ao fechar: ${updateError?.message ?? "desconhecido"}`,
      "INTERNAL_ERROR",
    );
  }

  await logAudit(supabase, {
    orgId,
    action: "close",
    resourceType: "periodo_dados",
    resourceId: periodId,
    metadata: {
      colecoes: colecoesCount ?? 0,
      evidencias: evidenciasCount ?? 0,
      previous_status: current.status,
    },
  });

  return ok({
    periodId,
    status: "fechado",
    closedAt: updated.closed_at ?? now,
  });
}
