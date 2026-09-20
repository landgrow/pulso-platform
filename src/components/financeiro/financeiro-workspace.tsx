"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  createFinanceEntry,
  deleteFinanceEntry,
  getFinanceWorkspace,
} from "@/app/actions/financeiro";
import { FinanceCharts } from "@/components/charts";
import {
  cashflowFromLines,
  currentMonth,
  monthLabel,
  parseMoney,
  sumEntradasPorOrigem,
  taxOnInvoice,
} from "@/lib/financeiro/ledger";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MenuSelect } from "@/components/ui/menu-select";
import { PdfExportButton } from "@/components/reports/pdf-export-button";
import { PageHeader } from "@/components/ui/page-header";
import { exportFinanceiroPdf } from "@/app/actions/reports";
import {
  ENTRY_ORIGIN_LABELS,
  INCOME_ORIGINS,
  type FinanceEntry,
  type FinanceEntryOrigin,
  type FinanceWorkspace,
} from "@/types/financeiro";

function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function firstDay(month: string): string {
  return `${month}-01`;
}

export function FinanceiroWorkspace(): JSX.Element {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<FinanceWorkspace | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh(nextMonth = month): Promise<void> {
    setLoading(true);
    const result = await getFinanceWorkspace(nextMonth);
    if (!result.success) {
      toast.error(result.error);
      setData(null);
    } else {
      setData(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await getFinanceWorkspace(month);
      if (cancelled) return;
      if (!result.success) {
        toast.error(result.error);
        setData(null);
      } else {
        setData(result.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [month]);

  const entradas = useMemo(
    () =>
      (data?.entries ?? [])
        .filter(
          (entry) =>
            entry.kind === "entrada" && entry.competenceDate.startsWith(month),
        )
        .sort((a, b) => a.competenceDate.localeCompare(b.competenceDate)),
    [data, month],
  );
  const saidas = useMemo(
    () =>
      (data?.entries ?? [])
        .filter(
          (entry) =>
            entry.kind === "saida" && entry.competenceDate.startsWith(month),
        )
        .sort((a, b) => a.competenceDate.localeCompare(b.competenceDate)),
    [data, month],
  );

  const balance = data?.monthBalance;
  const cashflow = useMemo(
    () =>
      cashflowFromLines(
        (data?.entries ?? []).map((entry) => ({
          kind: entry.kind,
          status: entry.status,
          amount: entry.amount,
          competenceDate: entry.competenceDate,
        })),
        month,
      ),
    [data, month],
  );
  const entradasPorOrigem = useMemo(
    () =>
      sumEntradasPorOrigem(
        (data?.entries ?? []).map((entry) => ({
          kind: entry.kind,
          status: entry.status,
          amount: entry.amount,
          competenceDate: entry.competenceDate,
          origin: entry.origin,
        })),
        month,
      ),
    [data, month],
  );

  return (
    <div className="max-w-[1280px] space-y-6">
      <PageHeader
        title="Financeiro"
        description="Controle do mês: o que entra (fee, projeto, edital), o imposto da nota e o que sai. Este balanço é o mesmo número das Métricas e do Dashboard."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PdfExportButton
              label="Exportar PDF"
              run={() => exportFinanceiroPdf(month)}
            />
            <Link
              href="/admin/metricas"
              className="text-sm text-primary hover:underline"
            >
              Ver nas Métricas
            </Link>
            <Input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="h-9 w-[11.5rem]"
              aria-label="Mês"
            />
          </div>
        }
      />

      {loading && !data ? (
        <div className="flex items-center justify-center py-16 text-text-2">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando o mês...
        </div>
      ) : null}

      {data && balance ? (
        <>
          <section className="overflow-hidden rounded-xl border border-border bg-surface-1">
            <div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-4 lg:divide-y-0">
              <Kpi
                label={`Entrou · ${monthLabel(month)}`}
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
                label="Balanço do mês"
                value={formatCurrency(balance.balanco)}
                hint={`líquido ${formatCurrency(balance.liquido)}`}
                tone={balance.balanco >= 0 ? "lime" : "danger"}
              />
            </div>
          </section>

          <FinanceCharts
            month={month}
            cashflow={cashflow}
            livroMes={balance}
            entradasPorOrigem={entradasPorOrigem}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <MonthColumn
              title="Entradas"
              empty="Nenhuma entrada neste mês. Fee, projeto ou edital entra aqui."
              lines={entradas}
              income
              footer={
                <IncomeForm
                  key={month}
                  month={month}
                  clients={data.clients}
                  onSaved={() => void refresh()}
                />
              }
              onDelete={async (id) => {
                const result = await deleteFinanceEntry(id);
                if (!result.success) toast.error(result.error);
                else {
                  toast.success("Entrada removida");
                  await refresh();
                }
              }}
            />
            <MonthColumn
              title="Saídas"
              empty="Nenhuma despesa neste mês."
              lines={saidas}
              income={false}
              footer={
                <ExpenseForm
                  key={month}
                  month={month}
                  categories={data.categories
                    .filter((category) => category.kind === "despesa")
                    .map((category) => ({
                      id: category.id,
                      name: category.name,
                    }))}
                  onSaved={() => void refresh()}
                />
              }
              onDelete={async (id) => {
                const result = await deleteFinanceEntry(id);
                if (!result.success) toast.error(result.error);
                else {
                  toast.success("Despesa removida");
                  await refresh();
                }
              }}
            />
          </div>
        </>
      ) : null}
    </div>
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
  tone?: "muted" | "lime" | "danger";
}): JSX.Element {
  return (
    <div className="px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-3">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          tone === "lime" && "text-brand-lime",
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

function MonthColumn({
  title,
  empty,
  lines,
  income,
  footer,
  onDelete,
}: {
  title: string;
  empty: string;
  lines: FinanceEntry[];
  income: boolean;
  footer: ReactNode;
  onDelete: (id: string) => Promise<void>;
}): JSX.Element {
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
              <li key={line.id} className="flex items-start gap-3 px-4 py-3">
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
                  onClick={() => void onDelete(line.id)}
                  className="mt-0.5 text-text-3 hover:text-error"
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-border p-4">{footer}</div>
    </section>
  );
}

function IncomeForm({
  month,
  clients,
  onSaved,
}: {
  month: string;
  clients: FinanceWorkspace["clients"];
  onSaved: () => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState<FinanceEntryOrigin>("fee_mensal");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(firstDay(month));
  const [clientId, setClientId] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");

  const parsedAmount = parseMoney(amount);
  const previewTax = taxOnInvoice(
    Number.isFinite(parsedAmount) ? parsedAmount : 0,
    Number(taxRate.replace(",", ".")) || 0,
  );

  async function submit(): Promise<void> {
    setBusy(true);
    const result = await createFinanceEntry({
      kind: "entrada",
      origin,
      status: "realizado",
      amount,
      taxRate: Number(taxRate.replace(",", ".")) || 0,
      invoiceRef: invoiceRef || null,
      competenceDate: date,
      description: description.trim() || ENTRY_ORIGIN_LABELS[origin],
      relatedOrgId: clientId || null,
    });
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Entrada lançada no mês");
    setDescription("");
    setAmount("");
    setInvoiceRef("");
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
      <p className="text-xs font-medium uppercase tracking-wide text-text-3">
        Nova entrada
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Tipo">
          <MenuSelect
            value={origin}
            onChange={(value) => setOrigin(value as FinanceEntryOrigin)}
            options={INCOME_ORIGINS.map((value) => ({
              value,
              label: ENTRY_ORIGIN_LABELS[value],
            }))}
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
        <Field label="Descrição" className="sm:col-span-2">
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex: Fee JS Construtora, projeto BIN, edital SEBRAE"
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
        <Field label="Data">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
        <Field label="Imposto da nota %">
          <Input
            value={taxRate}
            onChange={(event) => setTaxRate(event.target.value)}
            placeholder="6"
          />
        </Field>
        <Field label="Nº da nota">
          <Input
            value={invoiceRef}
            onChange={(event) => setInvoiceRef(event.target.value)}
            placeholder="Opcional"
          />
        </Field>
      </div>
      {previewTax > 0 ? (
        <p className="text-xs text-text-3">
          Imposto previsto {formatCurrency(previewTax)}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Lançar entrada
      </Button>
    </form>
  );
}

function ExpenseForm({
  month,
  categories,
  onSaved,
}: {
  month: string;
  categories: Array<{ id: string; name: string }>;
  onSaved: () => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(firstDay(month));
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");

  async function submit(): Promise<void> {
    setBusy(true);
    const categoryName =
      categories.find((category) => category.id === categoryId)?.name ?? "";
    const result = await createFinanceEntry({
      kind: "saida",
      origin: "despesa",
      status: "realizado",
      amount,
      competenceDate: date,
      categoryId: categoryId || null,
      description: description.trim() || categoryName || "Despesa",
    });
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Despesa lançada no mês");
    setDescription("");
    setAmount("");
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
      <p className="text-xs font-medium uppercase tracking-wide text-text-3">
        Nova despesa
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Tipo">
          <MenuSelect
            value={categoryId}
            onChange={setCategoryId}
            options={categories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
            className="h-10 rounded-md border border-border px-3"
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
        <Field label="Descrição" className="sm:col-span-2">
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex: Cursor, aluguel, viagem Campo Grande"
          />
        </Field>
        <Field label="Data">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
      </div>
      <Button type="submit" size="sm" disabled={busy} variant="outline">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Lançar saída
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-text-2">{label}</Label>
      {children}
    </div>
  );
}
