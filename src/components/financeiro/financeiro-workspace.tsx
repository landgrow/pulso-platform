"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  archiveFinanceFixedCost,
  confirmCrmCashInbox,
  createFinanceContract,
  createFinanceFixedCost,
  createFinanceInvoice,
  createFinanceInvoiceUploadUrl,
  deleteFinanceEntry,
  generateContractReceivables,
  getFinanceInvoiceFileUrl,
  getFinanceWorkspace,
  ignoreCrmCashInbox,
  updateFinanceEntryStatus,
} from "@/app/actions/financeiro";
import {
  BILL_BADGE_LABELS,
  billBadge,
  cashflowFromRange,
  CONTRACT_DUE_LABELS,
  currentMonth,
  defaultMonthsForPrograma,
  financeYears,
  FINANCE_RANGE_OPTIONS,
  inBillPeriod,
  inDateRange,
  periodCaption,
  periodViewBounds,
  rangeBounds,
  sumEntradasPorOrigemInRange,
  summarizeRange,
  todayIso,
  type ContractDueState,
  type FinanceBillBadge,
  type FinancePeriodView,
  type FinanceRange,
} from "@/lib/financeiro/ledger";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MenuSelect } from "@/components/ui/menu-select";
import { PageHeader } from "@/components/ui/page-header";
import { FinanceCharts } from "@/components/charts";
import { PdfExportButton } from "@/components/reports/pdf-export-button";
import { exportFinanceiroPdf } from "@/app/actions/reports";
import { FinanceCsvImport } from "@/components/financeiro/finance-csv-import";
import {
  ExpenseForm,
  Field,
  IncomeForm,
} from "@/components/financeiro/finance-forms";
import {
  ENTRY_ORIGIN_LABELS,
  FINANCE_TAB_LABELS,
  INVOICE_KIND_LABELS,
  type FinanceContractRow,
  type FinanceEntry,
  type FinanceFixedCost,
  type FinanceHqTab,
  type FinanceInboxItem,
  type FinanceInvoice,
  type FinanceInvoiceKind,
  type FinanceOrgRow,
  type FinanceWorkspace,
  type MonthBalance,
} from "@/types/financeiro";
import { PROGRAMA_LABELS, type Programa } from "@/types/clientes";

function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function badgeClass(badge: FinanceBillBadge): string {
  if (badge === "recebido" || badge === "pago") {
    return "border-success/40 bg-success/10 text-success";
  }
  if (badge === "vencido") return "border-error/40 bg-error/10 text-error";
  if (badge === "vence_hoje") {
    return "border-warning/40 bg-warning/10 text-warning";
  }
  return "border-border bg-surface-2 text-text-2";
}

function dueStateClass(state: ContractDueState): string {
  if (state === "vencido") return "border-error/40 bg-error/10 text-error";
  if (state === "vence_breve") {
    return "border-warning/40 bg-warning/10 text-warning";
  }
  if (state === "vigente")
    return "border-success/40 bg-success/10 text-success";
  return "border-border bg-surface-2 text-text-2";
}

export function FinanceiroWorkspace(): JSX.Element {
  const [tab, setTab] = useState<FinanceHqTab>("livro");
  const [range, setRange] = useState<FinanceRange>("year");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [appliedYear, setAppliedYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [view, setView] = useState<FinancePeriodView>("semana");
  const [compose, setCompose] = useState<"entrada" | "saida" | "nota" | null>(
    null,
  );
  const [data, setData] = useState<FinanceWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const today = todayIso();
  const month = currentMonth();
  const bookBounds = useMemo(
    () => rangeBounds(range, new Date(), appliedYear),
    [range, appliedYear],
  );
  const period = periodCaption(range, appliedYear);
  const years = useMemo(() => financeYears(data?.entries ?? []), [data]);
  const billBounds = periodViewBounds(view, today);
  const fromLivro = tab === "livro";

  async function refresh(): Promise<void> {
    setLoading(true);
    const result = await getFinanceWorkspace(month, year);
    if (!result.success) {
      toast.error(result.error);
      setData(null);
    } else {
      setAppliedYear(year);
      setData(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await getFinanceWorkspace(month, year);
      if (cancelled) return;
      if (!result.success) {
        toast.error(result.error);
        setData(null);
      } else {
        setAppliedYear(year);
        setData(result.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const entradas = useMemo(
    () =>
      (data?.entries ?? [])
        .filter(
          (entry) =>
            entry.kind === "entrada" &&
            inDateRange(entry.competenceDate, bookBounds.from, bookBounds.to),
        )
        .sort((a, b) => a.competenceDate.localeCompare(b.competenceDate)),
    [data, bookBounds],
  );
  const saidas = useMemo(
    () =>
      (data?.entries ?? [])
        .filter(
          (entry) =>
            entry.kind === "saida" &&
            inDateRange(entry.competenceDate, bookBounds.from, bookBounds.to),
        )
        .sort((a, b) => a.competenceDate.localeCompare(b.competenceDate)),
    [data, bookBounds],
  );
  const balance = useMemo(
    () =>
      summarizeRange(
        (data?.entries ?? []).map((entry) => ({
          kind: entry.kind,
          status: entry.status,
          amount: entry.amount,
          taxAmount: entry.taxAmount,
          competenceDate: entry.competenceDate,
        })),
        bookBounds.from,
        bookBounds.to,
      ),
    [data, bookBounds],
  );
  const cashflow = useMemo(
    () =>
      cashflowFromRange(
        (data?.entries ?? []).map((entry) => ({
          kind: entry.kind,
          status: entry.status,
          amount: entry.amount,
          competenceDate: entry.competenceDate,
        })),
        range,
        bookBounds.from,
        bookBounds.to,
      ),
    [data, range, bookBounds],
  );
  const receber = useMemo(
    () =>
      (data?.entries ?? [])
        .filter(
          (entry) =>
            entry.kind === "entrada" &&
            inBillPeriod(entry, billBounds.from, billBounds.to),
        )
        .sort((a, b) =>
          (a.dueDate ?? a.competenceDate).localeCompare(
            b.dueDate ?? b.competenceDate,
          ),
        ),
    [data, billBounds],
  );
  const pagar = useMemo(
    () =>
      (data?.entries ?? [])
        .filter(
          (entry) =>
            entry.kind === "saida" &&
            inBillPeriod(entry, billBounds.from, billBounds.to),
        )
        .sort((a, b) =>
          (a.dueDate ?? a.competenceDate).localeCompare(
            b.dueDate ?? b.competenceDate,
          ),
        ),
    [data, billBounds],
  );
  const openReceber = receber
    .filter((entry) => entry.status === "previsto")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const openPagar = pagar
    .filter((entry) => entry.status === "previsto")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const doneReceber = receber
    .filter((entry) => entry.status === "realizado")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const donePagar = pagar
    .filter((entry) => entry.status === "realizado")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const saldo = doneReceber - donePagar + (openReceber - openPagar);

  const expenseCategories =
    data?.categories
      .filter((category) => category.kind === "despesa")
      .map((category) => ({ id: category.id, name: category.name })) ?? [];

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Financeiro"
        description="Contrato gera as parcelas. Despesa fixa gera o que pagar no mês. Card ganho do CRM só entra no caixa depois da confirmação."
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-9"
          disabled={!data}
          onClick={() => setCompose("entrada")}
        >
          <Plus className="h-4 w-4" />
          {fromLivro ? "Entrada" : "A receber"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          disabled={!data}
          onClick={() => setCompose("saida")}
        >
          <Plus className="h-4 w-4" />
          {fromLivro ? "Saída" : "A pagar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          disabled={!data}
          onClick={() => setCompose("nota")}
        >
          <Plus className="h-4 w-4" />
          Nota
        </Button>
        <FinanceCsvImport onImported={() => void refresh()} />
        <PdfExportButton label="PDF" run={() => exportFinanceiroPdf(month)} />
        {tab === "livro" ? (
          <>
            <MenuSelect
              value={String(year)}
              onChange={(value) => setYear(Number(value))}
              options={years.map((option) => ({
                value: String(option),
                label: String(option),
              }))}
              aria-label="Ano"
              className="h-9 w-[6.75rem] rounded-md border border-border px-3"
            />
            <MenuSelect
              value={range}
              onChange={(value) => setRange(value as FinanceRange)}
              options={FINANCE_RANGE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              aria-label="Período"
              className="h-9 min-w-[10rem] rounded-md border border-border px-3"
            />
          </>
        ) : null}
      </div>

      <div className="-mx-1 overflow-x-auto">
        <div className="flex min-w-max gap-1 border-b border-border px-1">
          {(Object.keys(FINANCE_TAB_LABELS) as FinanceHqTab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm",
                tab === item
                  ? "border-primary text-text-1"
                  : "border-transparent text-text-2 hover:text-text-1",
              )}
            >
              {FINANCE_TAB_LABELS[item]}
              {item === "caixa" && (data?.inbox.length ?? 0) > 0
                ? ` (${data?.inbox.length})`
                : ""}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-16 text-text-2">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando o livro...
        </div>
      ) : null}

      {data ? (
        <>
          {tab === "semana" || tab === "contas" ? (
            <div className="flex rounded-md border border-border">
              {(["hoje", "semana", "mes"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setView(item)}
                  className={cn(
                    "px-3 py-1.5 text-xs capitalize",
                    view === item
                      ? "bg-primary text-primary-foreground"
                      : "text-text-2 hover:bg-surface-2",
                  )}
                >
                  {item === "mes" ? "mês" : item}
                </button>
              ))}
            </div>
          ) : null}

          {tab === "livro" ? (
            <LivroBoard
              period={period}
              month={month}
              balance={balance}
              cashflow={cashflow}
              entries={data.entries}
              bookBounds={bookBounds}
              entradas={entradas}
              saidas={saidas}
              clients={data.clients}
              categories={expenseCategories}
              onChanged={() => void refresh()}
            />
          ) : null}

          {tab === "semana" ? (
            <WeekBoard
              today={today}
              receber={receber}
              pagar={pagar}
              openReceber={openReceber}
              openPagar={openPagar}
              doneReceber={doneReceber}
              donePagar={donePagar}
              saldo={saldo}
              onChanged={() => void refresh()}
            />
          ) : null}

          {tab === "contratos" ? (
            <ContractsPanel
              today={today}
              orgs={data.orgs}
              fixedCosts={data.fixedCosts}
              categories={expenseCategories}
              onChanged={() => void refresh()}
            />
          ) : null}

          {tab === "contas" ? (
            <BillsTable
              today={today}
              entries={[...receber, ...pagar].sort((a, b) =>
                (a.dueDate ?? a.competenceDate).localeCompare(
                  b.dueDate ?? b.competenceDate,
                ),
              )}
              clients={data.clients}
              categories={expenseCategories}
              onChanged={() => void refresh()}
            />
          ) : null}

          {tab === "notas" ? <NotesPanel invoices={data.invoices} /> : null}

          {tab === "caixa" ? (
            <InboxPanel items={data.inbox} onChanged={() => void refresh()} />
          ) : null}

          <Dialog
            open={compose != null}
            onOpenChange={(open) => {
              if (!open) setCompose(null);
            }}
          >
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {compose === "nota"
                    ? "Anexar nota"
                    : compose === "saida"
                      ? fromLivro
                        ? "Lançar saída"
                        : "Conta a pagar"
                      : fromLivro
                        ? "Lançar entrada"
                        : "Conta a receber"}
                </DialogTitle>
                <DialogDescription>
                  {compose === "nota"
                    ? "Sobe o PDF ou XML da nota. Não emitimos documento fiscal daqui."
                    : compose === "saida"
                      ? "Despesa do recorte. O valor fica em branco até você preencher."
                      : "Fee, projeto ou edital. Entra no livro na data de competência."}
                </DialogDescription>
              </DialogHeader>
              {compose === "entrada" ? (
                <IncomeForm
                  key={`entrada-${today}-${fromLivro ? "livro" : "conta"}`}
                  hideHeading
                  defaultDate={today}
                  defaultRealized={fromLivro}
                  clients={data.clients}
                  onSaved={() => {
                    setCompose(null);
                    void refresh();
                  }}
                  onCancel={() => setCompose(null)}
                />
              ) : null}
              {compose === "saida" ? (
                <ExpenseForm
                  key={`saida-${today}-${fromLivro ? "livro" : "conta"}`}
                  hideHeading
                  defaultDate={today}
                  defaultRealized={fromLivro}
                  categories={expenseCategories}
                  onSaved={() => {
                    setCompose(null);
                    void refresh();
                  }}
                  onCancel={() => setCompose(null)}
                />
              ) : null}
              {compose === "nota" ? (
                <InvoiceForm
                  clients={data.clients}
                  onSaved={() => {
                    setCompose(null);
                    void refresh();
                  }}
                  onCancel={() => setCompose(null)}
                />
              ) : null}
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}

function LivroBoard({
  period,
  month,
  balance,
  cashflow,
  entries,
  bookBounds,
  entradas,
  saidas,
  clients,
  categories,
  onChanged,
}: {
  period: string;
  month: string;
  balance: MonthBalance;
  cashflow: FinanceWorkspace["summary"]["cashflow"];
  entries: FinanceEntry[];
  bookBounds: { from: string; to: string };
  entradas: FinanceEntry[];
  saidas: FinanceEntry[];
  clients: FinanceWorkspace["clients"];
  categories: Array<{ id: string; name: string }>;
  onChanged: () => void;
}): JSX.Element {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-border bg-surface-1">
        <div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-4 lg:divide-y-0">
          <Kpi
            label={`Entrou · ${period}`}
            value={formatCurrency(balance.entradas)}
            hint={`${entradas.length} entrada${entradas.length === 1 ? "" : "s"}`}
          />
          <Kpi
            label="Imposto das notas"
            value={formatCurrency(balance.impostosNotas)}
            hint="marcado em cada entrada"
          />
          <Kpi
            label="Saiu"
            value={formatCurrency(balance.saidas)}
            hint={`${saidas.length} despesa${saidas.length === 1 ? "" : "s"}`}
          />
          <Kpi
            label="Balanço do recorte"
            value={formatCurrency(balance.balanco)}
            hint={`líquido ${formatCurrency(balance.liquido)}`}
            tone={balance.balanco >= 0 ? "positive" : "danger"}
          />
        </div>
      </section>

      <FinanceCharts
        month={month}
        cashflow={cashflow}
        livroMes={balance}
        entradasPorOrigem={sumEntradasPorOrigemInRange(
          entries,
          bookBounds.from,
          bookBounds.to,
        )}
        periodLabel={period}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <MonthColumn
          title="Entradas"
          empty="Nenhuma entrada neste recorte. Use Entrada acima para lançar."
          lines={entradas}
          income
          clients={clients}
          categories={[]}
          onChanged={onChanged}
        />
        <MonthColumn
          title="Saídas"
          empty="Nenhuma despesa neste recorte. Use Saída acima para lançar."
          lines={saidas}
          income={false}
          clients={clients}
          categories={categories}
          onChanged={onChanged}
        />
      </div>
    </div>
  );
}

function MonthColumn({
  title,
  empty,
  lines,
  income,
  clients,
  categories,
  onChanged,
}: {
  title: string;
  empty: string;
  lines: FinanceEntry[];
  income: boolean;
  clients: FinanceWorkspace["clients"];
  categories: Array<{ id: string; name: string }>;
  onChanged: () => void;
}): JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="flex flex-col rounded-xl border border-border bg-surface-1">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-1">{title}</h2>
      </header>
      <div className="min-h-[12rem] flex-1">
        {lines.length === 0 ? (
          <p className="px-4 py-8 text-sm text-text-2">{empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {lines.map((line) => (
              <li key={line.id} className="px-4 py-3">
                {editingId === line.id ? (
                  income ? (
                    <IncomeForm
                      defaultDate={line.competenceDate}
                      clients={clients}
                      initial={line}
                      onSaved={() => {
                        setEditingId(null);
                        onChanged();
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <ExpenseForm
                      defaultDate={line.competenceDate}
                      categories={categories}
                      initial={line}
                      onSaved={() => {
                        setEditingId(null);
                        onChanged();
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  )
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-1">
                        {line.description}
                      </p>
                      <p className="mt-0.5 text-xs text-text-3">
                        {formatDay(line.competenceDate)}
                        {" · "}
                        {ENTRY_ORIGIN_LABELS[line.origin]}
                        {line.relatedOrgName ? ` · ${line.relatedOrgName}` : ""}
                        {line.invoiceRef ? ` · nota ${line.invoiceRef}` : ""}
                      </p>
                      {income && line.taxAmount > 0 ? (
                        <p className="mt-1 text-xs text-text-2">
                          Imposto da nota{" "}
                          {line.taxRate > 0 ? `${line.taxRate}% · ` : ""}
                          {formatCurrency(line.taxAmount)} · líquido{" "}
                          {formatCurrency(line.amount - line.taxAmount)}
                        </p>
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        income ? "text-success" : "text-error",
                      )}
                    >
                      {income ? "" : "−"}
                      {formatCurrency(line.amount)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingId(line.id)}
                      className="mt-0.5 text-text-3 hover:text-text-1"
                      aria-label="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          const result = await deleteFinanceEntry(line.id);
                          if (!result.success) toast.error(result.error);
                          else {
                            toast.success(
                              income ? "Entrada removida" : "Despesa removida",
                            );
                            onChanged();
                          }
                        })();
                      }}
                      className="mt-0.5 text-text-3 hover:text-error"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function WeekBoard({
  today,
  receber,
  pagar,
  openReceber,
  openPagar,
  doneReceber,
  donePagar,
  saldo,
  onChanged,
}: {
  today: string;
  receber: FinanceEntry[];
  pagar: FinanceEntry[];
  openReceber: number;
  openPagar: number;
  doneReceber: number;
  donePagar: number;
  saldo: number;
  onChanged: () => void;
}): JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface-1">
      <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <BillColumn
          title="A receber"
          total={openReceber}
          done={doneReceber}
          empty="Nada a receber neste recorte."
          lines={receber}
          today={today}
          income
          onChanged={onChanged}
        />
        <BillColumn
          title="A pagar"
          total={openPagar}
          done={donePagar}
          empty="Nada a pagar neste recorte."
          lines={pagar}
          today={today}
          income={false}
          onChanged={onChanged}
        />
      </div>
      <footer className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
        <span className="text-text-2">Saldo previsto do recorte</span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            saldo >= 0 ? "text-success" : "text-error",
          )}
        >
          {saldo >= 0 ? "+" : ""}
          {formatCurrency(saldo)}
        </span>
      </footer>
    </section>
  );
}

function BillColumn({
  title,
  total,
  done,
  empty,
  lines,
  today,
  income,
  onChanged,
}: {
  title: string;
  total: number;
  done: number;
  empty: string;
  lines: FinanceEntry[];
  today: string;
  income: boolean;
  onChanged: () => void;
}): JSX.Element {
  return (
    <div className="min-h-[18rem]">
      <header className="border-b border-border px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-3">
          {title}
        </p>
        <p
          className={cn(
            "mt-1 text-xl font-semibold tabular-nums",
            income ? "text-success" : "text-error",
          )}
        >
          {formatCurrency(total)}
        </p>
        <p className="text-xs text-text-3">
          {formatCurrency(done)} {income ? "recebidos" : "pagos"}
        </p>
      </header>
      {lines.length === 0 ? (
        <p className="px-4 py-8 text-sm text-text-2">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {lines.map((line) => (
            <BillRow
              key={line.id}
              line={line}
              today={today}
              onChanged={onChanged}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function BillRow({
  line,
  today,
  onChanged,
}: {
  line: FinanceEntry;
  today: string;
  onChanged: () => void;
}): JSX.Element {
  const badge = billBadge(line, today);
  const due = line.dueDate ?? line.competenceDate;
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-1">
          {line.relatedOrgName ?? line.description}
        </p>
        <p className="mt-0.5 text-xs text-text-3">
          {line.relatedOrgName ? `${line.description} · ` : ""}
          {formatDay(due)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            line.kind === "entrada" ? "text-text-1" : "text-error",
          )}
        >
          {formatCurrency(line.amount)}
        </p>
        <span
          className={cn(
            "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
            badgeClass(badge),
          )}
        >
          {BILL_BADGE_LABELS[badge]}
        </span>
      </div>
      {line.status === "previsto" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 text-[11px]"
          onClick={() => {
            void (async () => {
              const result = await updateFinanceEntryStatus({
                entryId: line.id,
                status: "realizado",
              });
              if (!result.success) toast.error(result.error);
              else onChanged();
            })();
          }}
        >
          {line.kind === "entrada" ? "Receber" : "Pagar"}
        </Button>
      ) : null}
    </li>
  );
}

function ContractsPanel({
  today,
  orgs,
  fixedCosts,
  categories,
  onChanged,
}: {
  today: string;
  orgs: FinanceOrgRow[];
  fixedCosts: FinanceFixedCost[];
  categories: Array<{ id: string; name: string }>;
  onChanged: () => void;
}): JSX.Element {
  const active = orgs.filter((org) => !org.deleted);
  const closed = orgs.filter((org) => org.deleted);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-surface-1">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Carteira e contratos</h2>
          <p className="text-xs text-text-3">
            Valor e meses do contrato viram parcelas a receber. Marque pago na
            parcela — o vencimento do contrato fica separado.
          </p>
        </header>
        {active.length === 0 ? (
          <p className="px-4 py-8 text-sm text-text-2">
            Nenhuma organização na carteira. Cadastre em Organizações.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {active.map((org) => (
              <OrgContractCard
                key={org.orgId}
                org={org}
                today={today}
                onChanged={onChanged}
              />
            ))}
          </ul>
        )}
        {closed.length > 0 ? (
          <details className="border-t border-border">
            <summary className="cursor-pointer px-4 py-3 text-xs text-text-3">
              Encerradas ({closed.length})
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {closed.map((org) => (
                <OrgContractCard
                  key={org.orgId}
                  org={org}
                  today={today}
                  onChanged={onChanged}
                />
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <FixedCostsPanel
        costs={fixedCosts}
        categories={categories}
        onChanged={onChanged}
      />
    </div>
  );
}

function OrgContractCard({
  org,
  today,
  onChanged,
}: {
  org: FinanceOrgRow;
  today: string;
  onChanged: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-1">{org.orgName}</p>
          <p className="text-xs text-text-3">
            {org.contratos.length === 0
              ? "Sem contrato — as entradas ainda precisam ser lançadas à mão."
              : `${org.contratos.length} contrato(s)`}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Fechar" : "Registrar contrato"}
        </Button>
      </div>
      {open ? (
        <OrgContractForm
          orgId={org.orgId}
          onSaved={() => {
            setOpen(false);
            onChanged();
          }}
          onCancel={() => setOpen(false)}
        />
      ) : null}
      {org.contratos.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {org.contratos.map((row) => (
            <ContractLine
              key={row.id}
              row={row}
              today={today}
              onChanged={onChanged}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function OrgContractForm({
  orgId,
  onSaved,
  onCancel,
}: {
  orgId: string;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const [programa, setPrograma] = useState<Programa>("scale");
  const [valor, setValor] = useState("");
  const [meses, setMeses] = useState(String(defaultMonthsForPrograma("scale")));
  const [dataInicio, setDataInicio] = useState(todayIso());
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="mt-3 grid gap-2 rounded-md border border-border bg-surface-2 p-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        void (async () => {
          setSaving(true);
          const result = await createFinanceContract({
            orgId,
            programa,
            valor,
            meses: Number(meses),
            dataInicio,
          });
          setSaving(false);
          if (!result.success) toast.error(result.error);
          else {
            toast.success("Contrato registrado. Parcelas já estão a receber.");
            onSaved();
          }
        })();
      }}
    >
      <label className="space-y-1 text-xs text-text-2">
        Programa
        <select
          className="flex h-9 w-full rounded-md border border-border bg-surface-1 px-2 text-sm text-text-1"
          value={programa}
          onChange={(event) => {
            const next = event.target.value as Programa;
            setPrograma(next);
            setMeses(String(defaultMonthsForPrograma(next)));
          }}
        >
          {(Object.keys(PROGRAMA_LABELS) as Programa[]).map((item) => (
            <option key={item} value={item}>
              {PROGRAMA_LABELS[item]}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-xs text-text-2">
        Valor da parcela / contrato
        <Input
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          placeholder="0,00"
          required
        />
      </label>
      <label className="space-y-1 text-xs text-text-2">
        Meses
        <Input
          type="number"
          min={1}
          max={60}
          value={meses}
          onChange={(event) => setMeses(event.target.value)}
          required
        />
      </label>
      <label className="space-y-1 text-xs text-text-2">
        Início
        <Input
          type="date"
          value={dataInicio}
          onChange={(event) => setDataInicio(event.target.value)}
          required
        />
      </label>
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Gerar parcelas
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function ContractLine({
  row,
  today,
  onChanged,
}: {
  row: FinanceContractRow;
  today: string;
  onChanged: () => void;
}): JSX.Element {
  const nextOpen = row.parcelas.find((item) => item.status === "previsto");
  return (
    <li className="rounded-md border border-border bg-surface-2 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {row.programa in PROGRAMA_LABELS
              ? PROGRAMA_LABELS[row.programa as Programa]
              : row.programa}
          </p>
          <p className="text-xs text-text-3">
            {row.meses} {row.meses === 1 ? "mês" : "meses"} ·{" "}
            {formatDay(row.dataInicio)}
            {row.dataFim ? ` → ${formatDay(row.dataFim)}` : ""} ·{" "}
            {row.recebidas}/{row.meses} pagas
          </p>
        </div>
        <p className="text-sm font-semibold tabular-nums">
          {formatCurrency(row.valor)}
        </p>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
            dueStateClass(row.dueState),
          )}
        >
          {CONTRACT_DUE_LABELS[row.dueState]}
        </span>
      </div>
      {nextOpen ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-text-2">
            Próxima parcela {formatDay(nextOpen.competenceDate)}
            {nextOpen.competenceDate < today ? " · atrasada" : ""}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              void (async () => {
                const result = await updateFinanceEntryStatus({
                  entryId: nextOpen.id,
                  status: "realizado",
                });
                if (!result.success) toast.error(result.error);
                else {
                  toast.success("Parcela marcada como recebida.");
                  onChanged();
                }
              })();
            }}
          >
            Receber
          </Button>
        </div>
      ) : row.status === "ativo" && row.abertas === 0 ? (
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              void (async () => {
                const result = await generateContractReceivables(row.id);
                if (!result.success) toast.error(result.error);
                else {
                  toast.success(
                    result.data.created > 0
                      ? `${result.data.created} parcela(s) gerada(s).`
                      : "Todas as parcelas deste contrato já existem.",
                  );
                  onChanged();
                }
              })();
            }}
          >
            Gerar parcelas faltantes
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function FixedCostsPanel({
  costs,
  categories,
  onChanged,
}: {
  costs: FinanceFixedCost[];
  categories: Array<{ id: string; name: string }>;
  onChanged: () => void;
}): JSX.Element {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const active = costs.filter((cost) => cost.active);

  return (
    <section className="rounded-xl border border-border bg-surface-1">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Despesas fixas mensais</h2>
        <p className="text-xs text-text-3">
          Aluguel, ferramentas, contador. Todo mês vira conta a pagar no dia
          escolhido — marque pago na aba Contas.
        </p>
      </header>
      <form
        className="grid gap-2 border-b border-border p-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            setSaving(true);
            const result = await createFinanceFixedCost({
              description,
              amount,
              dueDay: Number(dueDay),
              categoryId: categoryId || null,
            });
            setSaving(false);
            if (!result.success) toast.error(result.error);
            else {
              toast.success("Despesa fixa cadastrada.");
              setDescription("");
              setAmount("");
              onChanged();
            }
          })();
        }}
      >
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex.: Aluguel do escritório"
          required
        />
        <Input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Valor"
          required
        />
        <Input
          type="number"
          min={1}
          max={28}
          value={dueDay}
          onChange={(event) => setDueDay(event.target.value)}
          aria-label="Dia do vencimento"
          required
        />
        <select
          className="flex h-9 w-full rounded-md border border-border bg-surface-1 px-2 text-sm"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">Categoria (opcional)</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <div className="sm:col-span-2 lg:col-span-4">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Cadastrar despesa fixa
          </Button>
        </div>
      </form>
      {active.length === 0 ? (
        <p className="px-4 py-6 text-sm text-text-2">
          Nenhuma despesa fixa. Cadastre o que a operação paga todo mês.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {active.map((cost) => (
            <li
              key={cost.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{cost.description}</p>
                <p className="text-xs text-text-3">Todo dia {cost.dueDay}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(cost.amount)}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  void (async () => {
                    const result = await archiveFinanceFixedCost(cost.id);
                    if (!result.success) toast.error(result.error);
                    else onChanged();
                  })();
                }}
              >
                Encerrar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BillsTable({
  today,
  entries,
  clients,
  categories,
  onChanged,
}: {
  today: string;
  entries: FinanceEntry[];
  clients: FinanceWorkspace["clients"];
  categories: Array<{ id: string; name: string }>;
  onChanged: () => void;
}): JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null);
  const vencidos = entries.filter(
    (entry) => billBadge(entry, today) === "vencido",
  );
  const hoje = entries.filter(
    (entry) => billBadge(entry, today) === "vence_hoje",
  );
  const abertos = entries.filter((entry) =>
    ["a_receber", "a_pagar"].includes(billBadge(entry, today)),
  );
  const pagos = entries.filter((entry) =>
    ["recebido", "pago"].includes(billBadge(entry, today)),
  );

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface-1">
      <div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-4 lg:divide-y-0">
        <Kpi
          label="Vencidos"
          value={formatCurrency(
            vencidos.reduce((sum, row) => sum + row.amount, 0),
          )}
          hint={`${vencidos.length} conta(s)`}
          tone="danger"
        />
        <Kpi
          label="Vencem hoje"
          value={formatCurrency(hoje.reduce((sum, row) => sum + row.amount, 0))}
          hint={`${hoje.length} conta(s)`}
        />
        <Kpi
          label="Em aberto"
          value={formatCurrency(
            abertos.reduce((sum, row) => sum + row.amount, 0),
          )}
          hint={`${abertos.length} conta(s)`}
        />
        <Kpi
          label="Liquidado"
          value={formatCurrency(
            pagos.reduce((sum, row) => sum + row.amount, 0),
          )}
          hint={`${pagos.length} conta(s)`}
          tone="positive"
        />
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-8 text-sm text-text-2">
          Nenhuma conta neste recorte.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((line) => (
            <li key={line.id} className="px-4 py-3">
              {editingId === line.id ? (
                line.kind === "entrada" ? (
                  <IncomeForm
                    defaultDate={line.competenceDate}
                    clients={clients}
                    initial={line}
                    onSaved={() => {
                      setEditingId(null);
                      onChanged();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <ExpenseForm
                    defaultDate={line.competenceDate}
                    categories={categories}
                    initial={line}
                    onSaved={() => {
                      setEditingId(null);
                      onChanged();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                )
              ) : (
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{line.description}</p>
                    <p className="text-xs text-text-3">
                      {formatDay(line.dueDate ?? line.competenceDate)}
                      {line.relatedOrgName ? ` · ${line.relatedOrgName}` : ""}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      line.kind === "saida" && "text-error",
                    )}
                  >
                    {line.kind === "saida" ? "−" : ""}
                    {formatCurrency(line.amount)}
                  </p>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      badgeClass(billBadge(line, today)),
                    )}
                  >
                    {BILL_BADGE_LABELS[billBadge(line, today)]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingId(line.id)}
                    className="text-text-3 hover:text-text-1"
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        const result = await deleteFinanceEntry(line.id);
                        if (!result.success) toast.error(result.error);
                        else onChanged();
                      })();
                    }}
                    className="text-text-3 hover:text-error"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NotesPanel({ invoices }: { invoices: FinanceInvoice[] }): JSX.Element {
  return (
    <section className="rounded-xl border border-border bg-surface-1">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Notas anexadas</h2>
        <p className="text-xs text-text-3">
          Arquivo da NFS-e, NF-e ou recibo. Sem emissão.
        </p>
      </header>
      {invoices.length === 0 ? (
        <p className="px-4 py-8 text-sm text-text-2">
          Nenhuma nota anexada ainda. Use o botão Nota.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {invoices.map((invoice) => (
            <li
              key={invoice.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {INVOICE_KIND_LABELS[invoice.kind]} {invoice.number}
                </p>
                <p className="text-xs text-text-3">
                  {formatDay(invoice.issueDate)}
                  {invoice.recipientName ? ` · ${invoice.recipientName}` : ""}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(invoice.amount)}
              </p>
              {invoice.filePath ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void (async () => {
                      const result = await getFinanceInvoiceFileUrl(
                        invoice.filePath as string,
                      );
                      if (!result.success) toast.error(result.error);
                      else window.open(result.data.url, "_blank");
                    })();
                  }}
                >
                  Abrir arquivo
                </Button>
              ) : (
                <span className="text-xs text-text-3">Sem arquivo</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InboxPanel({
  items,
  onChanged,
}: {
  items: FinanceInboxItem[];
  onChanged: () => void;
}): JSX.Element {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return (
    <section className="rounded-xl border border-border bg-surface-1">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Confirmar entrada no caixa</h2>
        <p className="text-xs text-text-3">
          Só cards ganho do board Clientes, com valor. Editais e parceiros não
          entram. Confirmar lança no livro; ignorar tira da fila.
        </p>
        <p className="mt-1 text-lg font-semibold tabular-nums">
          {formatCurrency(total)}
        </p>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-sm text-text-2">
          Nenhum ganho do CRM esperando confirmação.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-text-3">
                  {item.column}
                  {item.orgName ? ` · ${item.orgName}` : ""}
                  {item.dueOn ? ` · ${formatDay(item.dueOn)}` : ""}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(item.amount)}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  void (async () => {
                    const result = await confirmCrmCashInbox(item.id);
                    if (!result.success) toast.error(result.error);
                    else {
                      toast.success("Entrada confirmada no caixa.");
                      onChanged();
                    }
                  })();
                }}
              >
                Confirmar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  void (async () => {
                    const result = await ignoreCrmCashInbox(item.id);
                    if (!result.success) toast.error(result.error);
                    else onChanged();
                  })();
                }}
              >
                Ignorar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InvoiceForm({
  clients,
  onSaved,
  onCancel,
}: {
  clients: FinanceWorkspace["clients"];
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [number, setNumber] = useState("");
  const [kind, setKind] = useState<FinanceInvoiceKind>("nfse");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [amount, setAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [clientId, setClientId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function submit(): Promise<void> {
    if (!file) {
      toast.error("Anexe o arquivo da nota.");
      return;
    }
    setBusy(true);
    const prepared = await createFinanceInvoiceUploadUrl(file.name, file.size);
    if (!prepared.success) {
      setBusy(false);
      toast.error(prepared.error);
      return;
    }
    const supabase = createBrowserSupabase();
    const uploaded = await supabase.storage
      .from("evidencias")
      .uploadToSignedUrl(prepared.data.path, prepared.data.token, file, {
        contentType: file.type || "application/octet-stream",
      });
    if (uploaded.error) {
      setBusy(false);
      toast.error("Não subi o arquivo da nota.");
      return;
    }
    const filePath = prepared.data.path;
    const fileName = prepared.data.name;
    const result = await createFinanceInvoice({
      number,
      kind,
      issueDate,
      amount,
      taxAmount: taxAmount || 0,
      recipientOrgId: clientId || null,
      status: filePath ? "emitida" : "rascunho",
      createEntry: true,
      filePath,
      fileName,
    });
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Nota registrada.");
    onSaved();
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Número">
          <Input
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            required
          />
        </Field>
        <Field label="Tipo">
          <MenuSelect
            value={kind}
            onChange={(value) => setKind(value as FinanceInvoiceKind)}
            options={Object.entries(INVOICE_KIND_LABELS).map(
              ([value, label]) => ({
                value,
                label,
              }),
            )}
            className="h-10 rounded-md border border-border px-3"
          />
        </Field>
        <Field label="Cliente">
          <MenuSelect
            value={clientId}
            onChange={setClientId}
            placeholder="Opcional"
            options={[
              { value: "", label: "Sem cliente" },
              ...clients.map((client) => ({
                value: client.orgId,
                label: client.name,
              })),
            ]}
            className="h-10 rounded-md border border-border px-3"
          />
        </Field>
        <Field label="Data">
          <Input
            type="date"
            value={issueDate}
            onChange={(event) => setIssueDate(event.target.value)}
            required
          />
        </Field>
        <Field label="Valor">
          <Input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            required
          />
        </Field>
        <Field label="Imposto (se houver)">
          <Input
            value={taxAmount}
            onChange={(event) => setTaxAmount(event.target.value)}
            placeholder="0,00"
          />
        </Field>
        <Field label="Arquivo da nota" className="sm:col-span-2">
          <Input
            type="file"
            accept=".pdf,.xml,.jpg,.jpeg,.png,.webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={busy || !number.trim() || !file}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Registrar nota
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = "muted",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "muted" | "positive" | "danger";
}): JSX.Element {
  return (
    <div className="px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-3">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          tone === "positive" && "text-success",
          tone === "danger" && "text-error",
          tone === "muted" && "text-text-1",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-text-3">{hint}</p>
    </div>
  );
}
