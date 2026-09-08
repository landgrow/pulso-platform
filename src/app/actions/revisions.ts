"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type {
  ColecaoTipo,
  Result,
  ErrorCode,
  TimelineEntry,
} from "@/types/collections";

function fail<T>(error: string, code: ErrorCode): Result<T> {
  return { success: false, error, code };
}
function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

const listRevisionsSchema = z.object({
  periodoId: z.string().uuid("ID de período inválido"),
});

interface ColecaoRow {
  id: string;
  tipo: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface RevisionRow {
  colecao_id: string;
  rev_number: number;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  change_summary: string[] | null;
  created_by: string | null;
  created_at: string;
}

export type ListColecaoRevisionsResult = Result<{ entries: TimelineEntry[] }>;

/**
 * Monta a timeline de histórico de um período: todas as revisions arquivadas
 * de todas as coleções + a versão atual "virtual" de cada uma (que só ganha
 * uma linha em `colecao_revisions` na PRÓXIMA edição, então precisa ser
 * sintetizada aqui a partir de `colecoes`). Ordenado por data, mais recente
 * primeiro — cronológico global do período, não agrupado por coleção.
 */
export async function listColecaoRevisions(
  raw: unknown,
): Promise<ListColecaoRevisionsResult> {
  const parsed = listRevisionsSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.errors[0]?.message ?? "Dados inválidos",
      "INVALID_INPUT",
    );
  }
  const { periodoId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Não autenticado", "PERMISSION_DENIED");

  const { data: colecoesData, error: cError } = await supabase
    .from("colecoes")
    .select(
      "id, tipo, payload, metadata, created_by, updated_by, created_at, updated_at",
    )
    .eq("periodo_id", periodoId);

  if (cError) return fail(`Erro: ${cError.message}`, "INTERNAL_ERROR");
  if (!colecoesData || colecoesData.length === 0) return ok({ entries: [] });

  const colecoes = colecoesData as unknown as ColecaoRow[];
  const colecaoIds = colecoes.map((c: ColecaoRow) => c.id);

  const { data: revisionsData, error: rError } = await supabase
    .from("colecao_revisions")
    .select(
      "colecao_id, rev_number, payload, metadata, change_summary, created_by, created_at",
    )
    .in("colecao_id", colecaoIds);

  if (rError) return fail(`Erro: ${rError.message}`, "INTERNAL_ERROR");

  const revisions = (revisionsData ?? []) as unknown as RevisionRow[];

  const maxRevByColecao = new Map<string, number>();
  for (const rev of revisions) {
    const current = maxRevByColecao.get(rev.colecao_id) ?? 0;
    if (rev.rev_number > current)
      maxRevByColecao.set(rev.colecao_id, rev.rev_number);
  }

  const entries: TimelineEntry[] = [];

  for (const c of colecoes) {
    entries.push({
      colecaoId: c.id,
      tipo: c.tipo as ColecaoTipo,
      revNumber: (maxRevByColecao.get(c.id) ?? 0) + 1,
      isCurrent: true,
      payload: c.payload,
      metadata: c.metadata,
      changeSummary: [],
      createdBy: c.updated_by ?? c.created_by,
      createdAt: c.updated_at,
    });
  }

  const tipoByColecao = new Map<string, ColecaoTipo>(
    colecoes.map((c: ColecaoRow) => [c.id, c.tipo as ColecaoTipo]),
  );

  for (const r of revisions) {
    const tipo = tipoByColecao.get(r.colecao_id);
    if (!tipo) continue;
    entries.push({
      colecaoId: r.colecao_id,
      tipo,
      revNumber: r.rev_number,
      isCurrent: false,
      payload: r.payload,
      metadata: r.metadata,
      changeSummary: r.change_summary ?? [],
      createdBy: r.created_by,
      createdAt: r.created_at,
    });
  }

  entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return ok({ entries });
}
