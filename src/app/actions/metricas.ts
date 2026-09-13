"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/supabase/platform-role-server";
import { getAtividadesDashboard } from "@/app/actions/boards";
import type { ContratoStatus, Moeda, Programa } from "@/types/clientes";

type Result<T> = { success: true; data: T } | { success: false; error: string };

export interface MetricasGerais {
  crm: {
    totalCards: number;
    convertidos: number;
    taxaConversao: number;
    porSetor: Record<string, number>;
    porKanban: { boardId: string; nome: string; total: number }[];
  };
  financeiro: {
    totalContratos: number;
    porStatus: Record<ContratoStatus, number>;
    receitaAtivaPorMoeda: Partial<Record<Moeda, number>>;
    receitaPorProgramaEMoeda: Partial<
      Record<Moeda, Partial<Record<Programa, number>>>
    >;
  };
}

/**
 * Métricas gerais do negócio da Land Grow — não é sobre um cliente específico,
 * é o painel interno: funil de CRM (todos os kanbans de leads/parceiros) +
 * financeiro real (contratos ativos/pausados/encerrados por programa e moeda,
 * a mesma tabela `contratos` que já alimenta /admin/clientes).
 */
export async function getMetricasGerais(): Promise<Result<MetricasGerais>> {
  const supabase = await createClient();
  try {
    await requirePlatformAdmin(supabase);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Acesso negado",
    };
  }

  const { data: internalOrg, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("is_internal", true)
    .single();
  if (orgError || !internalOrg) {
    return {
      success: false,
      error:
        "Organização interna não encontrada. Rode a migration 0012_operacao_interna.sql.",
    };
  }

  const [dashboardResult, boardsResult, contratosResult] = await Promise.all([
    getAtividadesDashboard(internalOrg.id, "crm"),
    supabase
      .from("boards")
      .select("id, name, board_cards(id, related_org_id)")
      .eq("org_id", internalOrg.id)
      .eq("module", "crm"),
    supabase.from("contratos").select("programa, valor, moeda, status"),
  ]);

  if (!dashboardResult.success)
    return { success: false, error: dashboardResult.error };
  if (boardsResult.error)
    return { success: false, error: boardsResult.error.message };
  if (contratosResult.error)
    return { success: false, error: contratosResult.error.message };

  const boards = (boardsResult.data ?? []) as Array<{
    id: string;
    name: string;
    board_cards: { id: string; related_org_id: string | null }[];
  }>;
  const porKanban = boards.map((b) => ({
    boardId: b.id,
    nome: b.name,
    total: (b.board_cards ?? []).length,
  }));
  const totalCards = porKanban.reduce((sum, b) => sum + b.total, 0);
  const convertidos = boards.reduce(
    (sum, b) =>
      sum + (b.board_cards ?? []).filter((c) => c.related_org_id).length,
    0,
  );
  const taxaConversao = totalCards > 0 ? (convertidos / totalCards) * 100 : 0;

  const contratos = (contratosResult.data ?? []) as Array<{
    programa: Programa;
    valor: number;
    moeda: Moeda;
    status: ContratoStatus;
  }>;

  const porStatus = { ativo: 0, pausado: 0, encerrado: 0 } as Record<
    ContratoStatus,
    number
  >;
  const receitaAtivaPorMoeda: Partial<Record<Moeda, number>> = {};
  const receitaPorProgramaEMoeda: Partial<
    Record<Moeda, Partial<Record<Programa, number>>>
  > = {};

  for (const c of contratos) {
    porStatus[c.status] += 1;
    if (c.status === "ativo") {
      receitaAtivaPorMoeda[c.moeda] =
        (receitaAtivaPorMoeda[c.moeda] ?? 0) + Number(c.valor);
      const porPrograma = (receitaPorProgramaEMoeda[c.moeda] ??= {});
      porPrograma[c.programa] =
        (porPrograma[c.programa] ?? 0) + Number(c.valor);
    }
  }

  return {
    success: true,
    data: {
      crm: {
        totalCards,
        convertidos,
        taxaConversao,
        porSetor: dashboardResult.data.por_setor,
        porKanban,
      },
      financeiro: {
        totalContratos: contratos.length,
        porStatus,
        receitaAtivaPorMoeda,
        receitaPorProgramaEMoeda,
      },
    },
  };
}
