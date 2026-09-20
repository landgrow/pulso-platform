import type {
  FinanceCashMonth,
  FinanceCategoryKind,
  FinanceDre,
  FinanceEntryKind,
  FinanceEntryOrigin,
  FinanceEntryStatus,
  FinanceSummary,
  MonthBalance,
} from "@/types/financeiro";

export interface LedgerEntryInput {
  kind: FinanceEntryKind;
  status: FinanceEntryStatus;
  amount: number;
  competenceDate: string;
  dueDate: string | null;
  paidAt: string | null;
  categoryKind: FinanceCategoryKind | null;
  accountId?: string | null;
}

export interface LedgerTaxInput {
  amount: number;
  status: "previsto" | "pago" | "atrasado";
  dueDate: string;
  periodStart: string;
  hasEntry: boolean;
}

export interface LedgerDeductionInput {
  amount: number;
  periodStart: string;
  periodEnd: string;
}

export function parseMoney(raw: string): number {
  const cleaned = raw
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : Number.NaN;
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function currentMonth(now = new Date()): string {
  return monthKey(todayIso(now));
}

export function monthLabel(month: string): string {
  const [year, mm] = month.split("-");
  const date = new Date(Number(year), Number(mm) - 1, 1);
  const label = date.toLocaleDateString("pt-BR", { month: "short" });
  return `${label.replace(".", "")} ${year}`;
}

export function lastMonths(month: string, count: number): string[] {
  const parts = month.split("-");
  const year = Number(parts[0]);
  const mm = Number(parts[1]);
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(year, mm - 1 - i, 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
  }
  return months;
}

function cashDate(entry: LedgerEntryInput): string {
  return entry.paidAt ?? entry.competenceDate;
}

export function isOverdue(entry: LedgerEntryInput, today: string): boolean {
  if (entry.status !== "previsto") return false;
  const due = entry.dueDate ?? entry.competenceDate;
  return due < today;
}

export function accountBalance(
  initial: number,
  entries: LedgerEntryInput[],
): number {
  let balance = initial;
  for (const entry of entries) {
    if (entry.status !== "realizado") continue;
    balance += entry.kind === "entrada" ? entry.amount : -entry.amount;
  }
  return balance;
}

export function taxOnInvoice(
  amount: number,
  rate: number,
  explicit: number | null = null,
): number {
  if (explicit != null && explicit > 0) {
    return Math.round(explicit * 100) / 100;
  }
  if (rate <= 0 || amount <= 0) return 0;
  return Math.round(amount * (rate / 100) * 100) / 100;
}

export function summarizeMonth(
  lines: Array<{
    kind: FinanceEntryKind;
    status: FinanceEntryStatus;
    amount: number;
    taxAmount: number;
    competenceDate: string;
  }>,
  month: string,
): MonthBalance {
  let entradas = 0;
  let impostosNotas = 0;
  let saidas = 0;

  for (const line of lines) {
    if (line.status === "cancelado") continue;
    if (monthKey(line.competenceDate) !== month) continue;
    if (line.kind === "entrada") {
      entradas += line.amount;
      impostosNotas += line.taxAmount;
    } else {
      saidas += line.amount;
    }
  }

  const liquido = entradas - impostosNotas;
  return {
    entradas,
    impostosNotas,
    saidas,
    liquido,
    balanco: liquido - saidas,
  };
}

export const EMPTY_MONTH_BALANCE: MonthBalance = {
  entradas: 0,
  impostosNotas: 0,
  saidas: 0,
  liquido: 0,
  balanco: 0,
};

export function sumEntradasPorOrigem(
  lines: Array<{
    kind: FinanceEntryKind;
    status: FinanceEntryStatus;
    amount: number;
    competenceDate: string;
    origin?: FinanceEntryOrigin | null;
  }>,
  month: string,
): Partial<Record<FinanceEntryOrigin, number>> {
  const totals: Partial<Record<FinanceEntryOrigin, number>> = {};
  for (const line of lines) {
    if (line.status === "cancelado" || line.kind !== "entrada") continue;
    if (monthKey(line.competenceDate) !== month) continue;
    const origin = line.origin ?? "outros";
    totals[origin] = (totals[origin] ?? 0) + line.amount;
  }
  return totals;
}

export function cashflowFromLines(
  lines: Array<{
    kind: FinanceEntryKind;
    status: FinanceEntryStatus;
    amount: number;
    competenceDate: string;
  }>,
  month: string,
  count = 6,
): FinanceCashMonth[] {
  const months = lastMonths(month, count);
  const map = new Map(months.map((key) => [key, { inflows: 0, outflows: 0 }]));

  for (const line of lines) {
    if (line.status === "cancelado") continue;
    const bucket = map.get(monthKey(line.competenceDate));
    if (!bucket) continue;
    if (line.kind === "entrada") bucket.inflows += line.amount;
    else bucket.outflows += line.amount;
  }

  return months.map((key) => {
    const row = map.get(key) ?? { inflows: 0, outflows: 0 };
    return {
      month: key,
      label: monthLabel(key),
      inflows: row.inflows,
      outflows: row.outflows,
      net: row.inflows - row.outflows,
    };
  });
}

export function composeReceitaAtiva(input: {
  monthBalance: MonthBalance | null;
  receitaContratosBrl: number;
  receitaObjetivosBrl: number;
}): number {
  const book = input.monthBalance;
  if (book && (book.entradas > 0 || book.saidas > 0)) {
    return book.liquido;
  }
  return input.receitaContratosBrl + input.receitaObjetivosBrl;
}

export function summarizeLedger(input: {
  entries: LedgerEntryInput[];
  taxes: LedgerTaxInput[];
  deductions: LedgerDeductionInput[];
  accountBalances: number[];
  today: string;
  month: string;
}): FinanceSummary {
  const { entries, taxes, deductions, accountBalances, today, month } = input;
  const saldo = accountBalances.reduce((sum, value) => sum + value, 0);

  let entradasMes = 0;
  let saidasMes = 0;
  let aReceber = 0;
  let aPagar = 0;
  let atrasadosReceber = 0;
  let atrasadosPagar = 0;

  const dre: FinanceDre = {
    receitaBruta: 0,
    deducoes: 0,
    receitaLiquida: 0,
    despesas: 0,
    impostos: 0,
    resultado: 0,
  };

  const months = lastMonths(month, 6);
  const cashMap = new Map<string, { inflows: number; outflows: number }>();
  for (const key of months) {
    cashMap.set(key, { inflows: 0, outflows: 0 });
  }

  for (const entry of entries) {
    const inMonth = monthKey(entry.competenceDate) === month;
    if (entry.status === "realizado") {
      if (inMonth && entry.kind === "entrada") entradasMes += entry.amount;
      if (inMonth && entry.kind === "saida") saidasMes += entry.amount;

      const cash = cashDate(entry);
      const bucket = cashMap.get(monthKey(cash));
      if (bucket) {
        if (entry.kind === "entrada") bucket.inflows += entry.amount;
        else bucket.outflows += entry.amount;
      }

      if (inMonth) {
        if (entry.kind === "entrada" && entry.categoryKind !== "deducao") {
          dre.receitaBruta += entry.amount;
        }
        if (entry.kind === "saida" && entry.categoryKind === "despesa") {
          dre.despesas += entry.amount;
        }
        if (entry.kind === "saida" && entry.categoryKind === "imposto") {
          dre.impostos += entry.amount;
        }
        if (entry.categoryKind === "deducao") {
          dre.deducoes += entry.amount;
        }
      }
    }

    if (entry.status === "previsto") {
      if (entry.kind === "entrada") {
        aReceber += entry.amount;
        if (isOverdue(entry, today)) atrasadosReceber += entry.amount;
      } else {
        aPagar += entry.amount;
        if (isOverdue(entry, today)) atrasadosPagar += entry.amount;
      }
    }
  }

  let impostosMes = 0;
  for (const tax of taxes) {
    const dueMonth = monthKey(tax.dueDate);
    const periodMonth = monthKey(tax.periodStart);
    if (dueMonth === month || periodMonth === month) {
      impostosMes += tax.amount;
    }
    if (!tax.hasEntry && tax.status === "pago" && periodMonth === month) {
      dre.impostos += tax.amount;
    }
  }

  for (const deduction of deductions) {
    if (
      monthKey(deduction.periodStart) <= month &&
      monthKey(deduction.periodEnd) >= month
    ) {
      dre.deducoes += deduction.amount;
    }
  }

  dre.receitaLiquida = dre.receitaBruta - dre.deducoes;
  dre.resultado = dre.receitaLiquida - dre.despesas - dre.impostos;

  const cashflow: FinanceCashMonth[] = months.map((key) => {
    const row = cashMap.get(key) ?? { inflows: 0, outflows: 0 };
    return {
      month: key,
      label: monthLabel(key),
      inflows: row.inflows,
      outflows: row.outflows,
      net: row.inflows - row.outflows,
    };
  });

  return {
    saldo,
    entradasMes,
    saidasMes,
    aReceber,
    aPagar,
    atrasadosReceber,
    atrasadosPagar,
    impostosMes,
    dre,
    cashflow,
  };
}
