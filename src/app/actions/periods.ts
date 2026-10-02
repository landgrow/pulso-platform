"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
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
import { authorizeOrg, authorizePeriodo } from "@/lib/auth/org-access";

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
  orgId: z.string().uuid().optional(),
});

const updatePeriodDataSchema = z.object({
  periodId: z.string().uuid("ID de período inválido"),
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

function accessCode(error: string): ErrorCode {
  return error === "Período não encontrado" ? "NOT_FOUND" : "PERMISSION_DENIED";
}

async function logAudit(args: {
  orgId: string;
  userId: string;
  action: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = await createAdminClient();
  const { error } = await admin.from("audit_log").insert({
    org_id: args.orgId,
    user_id: args.userId,
    action: args.action,
    resource_type: "periodo_dados",
    resource_id: args.resourceId,
    metadata: args.metadata ?? {},
  });
  if (error) console.error("[audit] periodo:", error.message);
}

/** Org explícita (da URL) ou, sem ela, a org ativa do cookie. */
async function resolveOrgId(orgId: string | undefined): Promise<string | null> {
  if (orgId) return orgId;
  const ctx = await requireOrganization().catch(() => null);
  return ctx?.org.id ?? null;
}

// ─── createPeriod ────────────────────────────────────────────────────────────

export type CreatePeriodResult = Result<{ periodId: string; created: boolean }>;

/** Cria (ou retorna) o período (mes, ano) do cliente da org. Idempotente. */
export async function createPeriod(raw: unknown): Promise<CreatePeriodResult> {
  const parsed = createPeriodSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const { mes, ano } = parsed.data;

  const orgId = await resolveOrgId(parsed.data.orgId);
  if (!orgId) return fail("Nenhuma organização ativa", "PERMISSION_DENIED");

  const auth = await authorizeOrg(orgId, { write: true });
  if (!auth.ok) return fail(auth.error, "PERMISSION_DENIED");

  const admin = await createAdminClient();
  const { data: cliente } = await admin
    .from("clientes")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();
  if (!cliente) {
    return fail("Cliente não encontrado para esta organização", "NOT_FOUND");
  }

  const { data: existing } = await admin
    .from("periodos_dados")
    .select("id")
    .eq("cliente_id", cliente.id)
    .eq("mes", mes)
    .eq("ano", ano)
    .maybeSingle();
  if (existing) return ok({ periodId: existing.id as string, created: false });

  const { data: created, error: insertError } = await admin
    .from("periodos_dados")
    .insert({ cliente_id: cliente.id, mes, ano, status: "em_coleta" })
    .select("id")
    .single();

  if (insertError || !created) {
    return fail(
      `Erro ao criar período: ${insertError?.message ?? "desconhecido"}`,
      "INTERNAL_ERROR",
    );
  }

  await logAudit({
    orgId,
    userId: auth.access.user.id,
    action: "create",
    resourceId: created.id as string,
    metadata: { mes, ano, status: "em_coleta" },
  });

  return ok({ periodId: created.id as string, created: true });
}

/** Cria (ou retorna) o período do mês/ano atual da org. */
export async function getOrCreateCurrentPeriod(
  orgId?: string,
): Promise<CreatePeriodResult> {
  const now = new Date();
  return createPeriod({
    mes: now.getMonth() + 1,
    ano: now.getFullYear(),
    ...(orgId ? { orgId } : {}),
  });
}

// ─── listPeriods ─────────────────────────────────────────────────────────────

export type ListPeriodsResult = Result<{ periods: PeriodSummary[] }>;

/** Períodos de uma org, do mais recente pro mais antigo. */
export async function listPeriods(raw: unknown): Promise<ListPeriodsResult> {
  const parsed = listPeriodsSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const { orgId } = parsed.data;

  const auth = await authorizeOrg(orgId);
  if (!auth.ok) return fail(auth.error, "PERMISSION_DENIED");

  // Em TS em vez do RPC list_periods_for_org: a função não existe no banco de
  // produção (migration 0005 nunca foi aplicada inteira lá).
  const admin = await createAdminClient();
  const { data: cliente } = await admin
    .from("clientes")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();
  if (!cliente) return ok({ periods: [] });

  const { data: rows, error } = await admin
    .from("periodos_dados")
    .select("id, mes, ano, status, closed_at, created_at")
    .eq("cliente_id", cliente.id)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false });
  if (error) {
    return fail(`Erro ao listar períodos: ${error.message}`, "INTERNAL_ERROR");
  }

  const ids = (rows ?? []).map((r) => r.id as string);
  const [{ data: cols }, { data: evs }] = ids.length
    ? await Promise.all([
        admin
          .from("colecoes")
          .select("periodo_id")
          .in("periodo_id", ids)
          .neq("status", "descartado"),
        admin.from("evidencias").select("periodo_id").in("periodo_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const count = (list: { periodo_id: string }[] | null, id: string): number =>
    (list ?? []).filter((r) => r.periodo_id === id).length;

  const periods: PeriodSummary[] = (rows ?? []).map((row) => ({
    id: row.id as string,
    mes: row.mes as number,
    ano: row.ano as number,
    status: row.status as PeriodoDados["status"],
    closed_at: (row.closed_at as string | null) ?? null,
    created_at: row.created_at as string,
    colecoes_count: count(
      cols as { periodo_id: string }[] | null,
      row.id as string,
    ),
    evidencias_count: count(
      evs as { periodo_id: string }[] | null,
      row.id as string,
    ),
  }));

  return ok({ periods });
}

// ─── getPeriod ───────────────────────────────────────────────────────────────

export type GetPeriodResult = Result<{ period: PeriodDetail }>;

/** Período com coleções, evidências e flags de permissão. */
export async function getPeriod(raw: unknown): Promise<GetPeriodResult> {
  const parsed = periodIdSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const { periodId } = parsed.data;

  const auth = await authorizePeriodo(periodId);
  if (!auth.ok) return fail(auth.error, accessCode(auth.error));

  const admin = await createAdminClient();
  const [{ data: periodo }, { data: colecoes }, { data: evidencias }] =
    await Promise.all([
      admin.from("periodos_dados").select("*").eq("id", periodId).single(),
      admin
        .from("colecoes")
        .select("*")
        .eq("periodo_id", periodId)
        .order("created_at", { ascending: true }),
      admin
        .from("evidencias")
        .select("*")
        .eq("periodo_id", periodId)
        .order("created_at", { ascending: true }),
    ]);

  if (!periodo) return fail("Período não encontrado", "NOT_FOUND");

  const { memberRole, platformRole, canWrite } = auth.access;
  const role = (memberRole ?? platformRole) as MembershipRole | null;
  const isClosed =
    periodo.status === "fechado" || periodo.status === "analisado";

  const period: PeriodDetail = {
    periodo: periodo as PeriodoDados,
    colecoes: (colecoes ?? []) as Colecao[],
    evidencias: (evidencias ?? []) as Evidencia[],
    canEdit: !isClosed && canWrite,
    canDelete:
      memberRole === "client_owner" || platformRole === "platform_admin",
    role,
  };

  return ok({ period });
}

// ─── updatePeriodData ────────────────────────────────────────────────────────

/** Atualiza o status de um período. Recusa período fechado e somente leitura. */
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
  if (!status) return fail("Nenhum campo para atualizar", "INVALID_INPUT");

  const auth = await authorizePeriodo(periodId, { write: true });
  if (!auth.ok) return fail(auth.error, accessCode(auth.error));
  if (auth.periodoStatus === "fechado") {
    return fail("Período está fechado", "PERIOD_CLOSED");
  }

  const admin = await createAdminClient();
  const { data: updated, error: updateError } = await admin
    .from("periodos_dados")
    .update({ status })
    .eq("id", periodId)
    .select("id, status")
    .single();

  if (updateError || !updated) {
    return fail(
      `Erro ao atualizar: ${updateError?.message ?? "desconhecido"}`,
      "INTERNAL_ERROR",
    );
  }

  await logAudit({
    orgId: auth.access.orgId,
    userId: auth.access.user.id,
    action: "update",
    resourceId: periodId,
    metadata: { changes: { status } },
  });

  return ok({ periodId, status: updated.status as PeriodoDados["status"] });
}

// ─── closePeriod ─────────────────────────────────────────────────────────────

/** Fecha o período. Idempotente. Só client_owner ou platform_admin. */
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

  const auth = await authorizePeriodo(periodId, { write: true });
  if (!auth.ok) return fail(auth.error, accessCode(auth.error));
  const { memberRole, platformRole, orgId, user } = auth.access;
  if (memberRole !== "client_owner" && platformRole !== "platform_admin") {
    return fail(
      "Apenas o dono da empresa ou um administrador pode fechar o período",
      "PERMISSION_DENIED",
    );
  }

  const admin = await createAdminClient();
  const { data: current } = await admin
    .from("periodos_dados")
    .select("status, closed_at")
    .eq("id", periodId)
    .single();
  if (!current) return fail("Período não encontrado", "NOT_FOUND");

  if (current.status === "fechado") {
    return ok({
      periodId,
      status: "fechado",
      closedAt:
        (current.closed_at as string | null) ?? new Date().toISOString(),
    });
  }

  if (
    current.status !== "em_coleta" &&
    current.status !== "pronto_para_analise"
  ) {
    return fail(
      `Não é possível fechar período com status '${current.status}'`,
      "INVALID_INPUT",
    );
  }

  const [{ count: colecoesCount }, { count: evidenciasCount }] =
    await Promise.all([
      admin
        .from("colecoes")
        .select("*", { count: "exact", head: true })
        .eq("periodo_id", periodId)
        .neq("status", "descartado"),
      admin
        .from("evidencias")
        .select("*", { count: "exact", head: true })
        .eq("periodo_id", periodId),
    ]);

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("periodos_dados")
    .update({ status: "fechado", closed_at: now })
    .eq("id", periodId)
    .select("id, status, closed_at")
    .single();

  if (updateError || !updated) {
    return fail(
      `Erro ao fechar: ${updateError?.message ?? "desconhecido"}`,
      "INTERNAL_ERROR",
    );
  }

  await logAudit({
    orgId,
    userId: user.id,
    action: "close",
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
    closedAt: (updated.closed_at as string | null) ?? now,
  });
}
