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
  periodLabel,
}: {
  month: string;
  cashflow: FinanceCashMonth[];
  livroMes: MonthBalance | null;
  entradasPorOrigem: Partial<Record<FinanceEntryOrigin, number>>;
  periodLabel?: string | undefined;
}): JSX.Element {
  const caption = periodLabel ?? month;
  return (
    <div className="space-y-4" key={caption}>
      <CashflowChart
        data={cashflow}
        title={`Balanço · ${caption}`}
        hint={`Competência no recorte ${caption}.`}
        summary={livroMes}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <OriginMixChart
          month={month}
          values={entradasPorOrigem}
          periodLabel={periodLabel}
        />
        <MonthSplitChart
          month={month}
          balance={livroMes}
          periodLabel={periodLabel}
        />
      </div>
    </div>
  );
}
