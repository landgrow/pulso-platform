"use server";

import { createClient } from "@/lib/supabase/server";
import type { Result, ErrorCode } from "@/types/collections";
import type { FormularioPayload } from "@/lib/validations/formulario";
import { calcProgresso } from "@/lib/validations/formulario";
import { markReadySchema } from "@/lib/validations/periodo-status";
import { isPlatformAdmin } from "@/lib/supabase/platform-role-server";

function fail<T>(error: string, code: ErrorCode): Result<T> {
  return { success: false, error, code };
}
function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

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
    console.error("[audit] Falha ao registrar:", err);
  }
}

export type MarkReadyForAnalysisResult = Result<{
  status: "pronto_para_analise";
}>;

/**
 * Marca um período como pronto para análise (AC-3 da Story 1.7).
 *
 * Regra de habilitação: formulário 100% preenchido + pelo menos 1 outra fonte
 * (upload, texto livre ou transcrição) — OU client_owner/platform_admin pode
 * fazer override dessa regra (ex: período com poucos dados mas o dono decide
 * seguir assim mesmo).
 *
 * Não reaproveita `updatePeriodData` (periods.ts) porque essa é uma
 * transição de negócio com regra própria e um audit log específico
 * (`mark_ready` com contagens), não uma edição genérica de campo.
 */
export async function markReadyForAnalysis(
  raw: unknown,
): Promise<MarkReadyForAnalysisResult> {
  const parsed = markReadySchema.safeParse(raw);
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

  const { data: periodo, error: pError } = await supabase
    .from("periodos_dados")
    .select("id, status, cliente_id, clientes!inner(org_id)")
    .eq("id", periodId)
    .single();

  if (pError || !periodo) return fail("Período não encontrado", "NOT_FOUND");

  const clienteJoin = periodo.clientes as
    { org_id: string } | { org_id: string }[] | null;
  const orgId = Array.isArray(clienteJoin)
    ? clienteJoin[0]?.org_id
    : clienteJoin?.org_id;
  if (!orgId) return fail("Organização não encontrada", "NOT_FOUND");

  if (periodo.status !== "em_coleta") {
    return fail("Período não está em coleta", "INVALID_INPUT");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle();

  const isAdmin = await isPlatformAdmin(supabase);

  const isOwnerOrAdmin = membership?.role === "client_owner" || isAdmin;

  if (!membership && !isAdmin) {
    return fail("Sem permissão nesta organização", "PERMISSION_DENIED");
  }
  if (membership?.role === "client_viewer") {
    return fail(
      "Sem permissão (client_viewer é somente leitura)",
      "PERMISSION_DENIED",
    );
  }

  const { data: formularioColecao } = await supabase
    .from("colecoes")
    .select("payload")
    .eq("periodo_id", periodId)
    .eq("tipo", "formulario")
    .neq("status", "descartado")
    .maybeSingle();

  const progresso = formularioColecao
    ? calcProgresso(formularioColecao.payload as Partial<FormularioPayload>)
    : 0;

  const { count: outrasColecoesCount } = await supabase
    .from("colecoes")
    .select("id", { count: "exact", head: true })
    .eq("periodo_id", periodId)
    .neq("tipo", "formulario")
    .neq("status", "descartado");

  const { count: evidenciasCount } = await supabase
    .from("evidencias")
    .select("id", { count: "exact", head: true })
    .eq("periodo_id", periodId);

  const hasOtherSource =
    (outrasColecoesCount ?? 0) > 0 || (evidenciasCount ?? 0) > 0;
  const meetsDefaultRule = progresso === 100 && hasOtherSource;

  if (!meetsDefaultRule && !isOwnerOrAdmin) {
    return fail(
      "Complete o formulário (100%) e adicione pelo menos 1 upload, texto ou áudio antes de marcar como pronto",
      "INVALID_INPUT",
    );
  }

  const { error: updateError } = await supabase
    .from("periodos_dados")
    .update({
      status: "pronto_para_analise",
      updated_at: new Date().toISOString(),
    })
    .eq("id", periodId);

  if (updateError) {
    return fail(
      `Erro ao marcar como pronto: ${updateError.message}`,
      "INTERNAL_ERROR",
    );
  }

  await logAudit(supabase, {
    orgId,
    action: "mark_ready",
    resourceType: "periodo_dados",
    resourceId: periodId,
    metadata: {
      formulario_progresso: progresso,
      outras_colecoes: outrasColecoesCount ?? 0,
      evidencias: evidenciasCount ?? 0,
      override: !meetsDefaultRule && isOwnerOrAdmin,
    },
  });

  return ok({ status: "pronto_para_analise" });
}
