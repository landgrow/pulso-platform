"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { authorizePeriodo } from "@/lib/auth/org-access";
import type { Result, ErrorCode } from "@/types/collections";
import { binProgressFromPayload } from "@/lib/bin-v2";
import { markReadySchema } from "@/lib/validations/periodo-status";

function fail<T>(error: string, code: ErrorCode): Result<T> {
  return { success: false, error, code };
}
function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export type MarkReadyForAnalysisResult = Result<{
  status: "pronto_para_analise";
}>;

/**
 * Marca um período como pronto para análise.
 *
 * Regra: formulário 100% + pelo menos 1 outra fonte (upload, texto ou
 * transcrição) — ou client_owner/platform_admin decide seguir assim mesmo.
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

  const auth = await authorizePeriodo(periodId, { write: true });
  if (!auth.ok) {
    return fail(
      auth.error,
      auth.error === "Período não encontrado"
        ? "NOT_FOUND"
        : "PERMISSION_DENIED",
    );
  }
  if (auth.periodoStatus !== "em_coleta") {
    return fail("Período não está em coleta", "INVALID_INPUT");
  }
  const { orgId, user, memberRole, platformRole } = auth.access;
  const isOwnerOrAdmin =
    memberRole === "client_owner" || platformRole === "platform_admin";

  const admin = await createAdminClient();
  const [
    { data: formularioColecao },
    { count: outrasColecoesCount },
    { count: evidenciasCount },
  ] = await Promise.all([
    admin
      .from("colecoes")
      .select("payload")
      .eq("periodo_id", periodId)
      .eq("tipo", "formulario")
      .neq("status", "descartado")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("colecoes")
      .select("id", { count: "exact", head: true })
      .eq("periodo_id", periodId)
      .neq("tipo", "formulario")
      .neq("status", "descartado"),
    admin
      .from("evidencias")
      .select("id", { count: "exact", head: true })
      .eq("periodo_id", periodId),
  ]);

  const progresso = formularioColecao
    ? binProgressFromPayload(
        formularioColecao.payload as Record<string, unknown>,
      )
    : 0;

  const hasOtherSource =
    (outrasColecoesCount ?? 0) > 0 || (evidenciasCount ?? 0) > 0;
  const meetsDefaultRule = progresso === 100 && hasOtherSource;

  if (!meetsDefaultRule && !isOwnerOrAdmin) {
    return fail(
      "Complete o formulário (100%) e adicione pelo menos 1 upload ou texto antes de marcar como pronto",
      "INVALID_INPUT",
    );
  }

  const { data: updated, error: updateError } = await admin
    .from("periodos_dados")
    .update({ status: "pronto_para_analise" })
    .eq("id", periodId)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return fail(
      `Erro ao marcar como pronto: ${updateError?.message ?? "período não atualizado"}`,
      "INTERNAL_ERROR",
    );
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    org_id: orgId,
    user_id: user.id,
    action: "mark_ready",
    resource_type: "periodo_dados",
    resource_id: periodId,
    metadata: {
      formulario_progresso: progresso,
      outras_colecoes: outrasColecoesCount ?? 0,
      evidencias: evidenciasCount ?? 0,
      override: !meetsDefaultRule && isOwnerOrAdmin,
    },
  });
  if (auditError) console.error("[audit] mark_ready:", auditError.message);

  return ok({ status: "pronto_para_analise" });
}
