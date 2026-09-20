"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAnyCapability } from "@/lib/supabase/platform-role-server";
import { getAtividadesDashboard } from "@/app/actions/boards";
import { collectOperacaoBridges } from "@/lib/ops/metric-bridge";
import {
  cashflowFromLines,
  composeReceitaAtiva,
  currentMonth,
  EMPTY_MONTH_BALANCE,
  sumEntradasPorOrigem,
  summarizeMonth,
} from "@/lib/financeiro/ledger";
import { toNumber } from "@/lib/worksmart/cascade";
import type { ContratoStatus, Moeda, Programa } from "@/types/clientes";
import type { WorksmartStatus } from "@/types/worksmart";
import type {
  FinanceCashMonth,
  FinanceEntryKind,
  FinanceEntryOrigin,
  FinanceEntryStatus,
  MonthBalance,
} from "@/types/financeiro";

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
    receitaContratosBrl: number;
    receitaObjetivosBrl: number;
    receitaCaixaBrl: number;
    mes: string;
    livroMes: MonthBalance;
    cashflow: FinanceCashMonth[];
    entradasPorOrigem: Partial<Record<FinanceEntryOrigin, number>>;
    receitaPorProgramaEMoeda: Partial<
      Record<Moeda, Partial<Record<Programa, number>>>
    >;
  };
  bridges: {
    clientesObjetivos: number;
  };
}

/**
 * Métricas gerais do negócio da Land Grow — não é sobre um cliente específico,
 * é o painel interno: funil de CRM (todos os kanbans de leads/parceiros) +
 * financeiro do mês (o mesmo livro de /admin/financeiro) + contratos e meta.
 */
export async function getMetricasGerais(): Promise<Result<MetricasGerais>> {
  const supabase = await createClient();
  try {
    await requireAnyCapability(supabase, ["metricas", "financeiro"]);
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

  const [
    dashboardResult,
    boardsResult,
    contratosResult,
    objetivosResult,
    caixaResult,
  ] = await Promise.all([
    getAtividadesDashboard(internalOrg.id, "crm"),
    supabase
      .from("boards")
      .select("id, name, board_cards(id, related_org_id)")
      .eq("org_id", internalOrg.id)
      .eq("module", "crm"),
    supabase.from("contratos").select("programa, valor, moeda, status"),
    supabase
      .from("worksmart_objectives")
      .select(
        "status, smart_especifica, worksmart_key_results ( current_value, target_value, unit )",
      ),
    supabase
      .from("finance_entries")
      .select("amount, kind, status, competence_date, tax_amount, origin")
      .eq("org_id", internalOrg.id)
      .neq("status", "cancelado"),
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

  const receitaContratosBrl = receitaAtivaPorMoeda.BRL ?? 0;
  const mes = currentMonth();
  const livroLinhas = caixaResult.error
    ? []
    : (
        (caixaResult.data ?? []) as Array<{
          amount: unknown;
          kind: FinanceEntryKind;
          status: FinanceEntryStatus;
          competence_date: string;
          tax_amount?: unknown;
          origin?: FinanceEntryOrigin | null;
        }>
      ).map((row) => ({
        kind: row.kind,
        status: row.status,
        amount: Number(row.amount ?? 0),
        taxAmount: Number(row.tax_amount ?? 0),
        competenceDate: row.competence_date,
        origin: row.origin ?? null,
      }));
  const livroMes = caixaResult.error
    ? EMPTY_MONTH_BALANCE
    : summarizeMonth(livroLinhas, mes);
  const cashflow = cashflowFromLines(livroLinhas, mes);
  const entradasPorOrigem = sumEntradasPorOrigem(livroLinhas, mes);
  const receitaCaixaBrl = livroMes.liquido;
  if (objetivosResult.error) {
    receitaAtivaPorMoeda.BRL = composeReceitaAtiva({
      monthBalance: livroMes,
      receitaContratosBrl,
      receitaObjetivosBrl: 0,
    });
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
          receitaContratosBrl,
          receitaObjetivosBrl: 0,
          receitaCaixaBrl,
          mes,
          livroMes,
          cashflow,
          entradasPorOrigem,
          receitaPorProgramaEMoeda,
        },
        bridges: { clientesObjetivos: 0 },
      },
    };
  }
  const objectiveRows = (
    (objetivosResult.data ?? []) as Array<{
      status: WorksmartStatus;
      smart_especifica: string | null;
      worksmart_key_results: Array<{
        current_value: unknown;
        target_value: unknown;
        unit: string | null;
      }> | null;
    }>
  ).map((row) => ({
    status: row.status,
    smartEspecifica: row.smart_especifica,
    keyResults: (row.worksmart_key_results ?? []).map((kr) => ({
      currentValue: toNumber(kr.current_value),
      targetValue: toNumber(kr.target_value),
      unit: kr.unit,
    })),
  }));
  const bridges = collectOperacaoBridges(objectiveRows);
  receitaAtivaPorMoeda.BRL = composeReceitaAtiva({
    monthBalance: livroMes,
    receitaContratosBrl,
    receitaObjetivosBrl: bridges.receitaObjetivosBrl,
  });

  const clientesCrm = convertidos + bridges.clientesObjetivos;
  const baseFunil = Math.max(totalCards, clientesCrm);
  const taxaComObjetivo = baseFunil > 0 ? (clientesCrm / baseFunil) * 100 : 0;

  return {
    success: true,
    data: {
      crm: {
        totalCards,
        convertidos: clientesCrm,
        taxaConversao: taxaComObjetivo,
        porSetor: dashboardResult.data.por_setor,
        porKanban,
      },
      financeiro: {
        totalContratos: contratos.length,
        porStatus,
        receitaAtivaPorMoeda,
        receitaContratosBrl,
        receitaObjetivosBrl: bridges.receitaObjetivosBrl,
        receitaCaixaBrl,
        mes,
        livroMes,
        cashflow,
        entradasPorOrigem,
        receitaPorProgramaEMoeda,
      },
      bridges: {
        clientesObjetivos: bridges.clientesObjetivos,
      },
    },
  };
}
