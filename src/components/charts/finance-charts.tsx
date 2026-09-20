"use client";

import type {
  FinanceCashMonth,
  FinanceEntryOrigin,
  MonthBalance,
} from "@/types/financeiro";
import { CashflowChart } from "./cashflow-chart";
import { MonthSplitChart } from "./month-split-chart";
import { OriginMixChart } from "./origin-mix-chart";

export function FinanceCharts({
  month,
  cashflow,
  livroMes,
  entradasPorOrigem,
}: {
  month: string;
  cashflow: FinanceCashMonth[];
  livroMes: MonthBalance | null;
  entradasPorOrigem: Partial<Record<FinanceEntryOrigin, number>>;
}): JSX.Element {
  return (
    <div className="space-y-4">
      <CashflowChart data={cashflow} />
      <div className="grid gap-4 xl:grid-cols-2">
        <OriginMixChart month={month} values={entradasPorOrigem} />
        <MonthSplitChart month={month} balance={livroMes} />
      </div>
    </div>
  );
}
