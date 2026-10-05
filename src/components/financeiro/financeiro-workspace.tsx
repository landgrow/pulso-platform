"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createFinanceEntry,
  deleteFinanceEntry,
  getFinanceWorkspace,
  updateFinanceEntry,
} from "@/app/actions/financeiro";
import {
  cashflowFromRange,
  currentMonth,
  financeYears,
  FINANCE_RANGE_OPTIONS,
  inDateRange,
  periodCaption,
  rangeBounds,
  sumEntradasPorOrigemInRange,
  summarizeRange,
  taxOnInvoice,
  todayIso,
  type FinanceRange,
} from "@/lib/financeiro/ledger";
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
import { Label } from "@/components/ui/label";
import { MenuSelect } from "@/components/ui/menu-select";
import { PageHeader } from "@/components/ui/page-header";
import { FinanceCharts } from "@/components/charts";
import { PdfExportButton } from "@/components/reports/pdf-export-button";
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

export function FinanceiroWorkspace(): JSX.Element {
  const [range, setRange] = useState<FinanceRange>("30d");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [appliedYear, setAppliedYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [compose, setCompose] = useState<"entrada" | "saida" | null>(null);
  const [data, setData] = useState<FinanceWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const month = currentMonth();
  const bounds = useMemo(
    () => rangeBounds(range, new Date(), appliedYear),
    [range, appliedYear],
  );
  const period = periodCaption(range, appliedYear);
  const years = useMemo(() => financeYears(data?.entries ?? []), [data]);

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
            inDateRange(entry.competenceDate, bounds.from, bounds.to),
        )
        .sort((a, b) => a.competenceDate.localeCompare(b.competenceDate)),
    [data, bounds],
  );
  const saidas = useMemo(
    () =>
      (data?.entries ?? [])
        .filter(
          (entry) =>
            entry.kind === "saida" &&
            inDateRange(entry.competenceDate, bounds.from, bounds.to),
        )
        .sort((a, b) => a.competenceDate.localeCompare(b.competenceDate)),
    [data, bounds],
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
        bounds.from,
        bounds.to,
      ),
    [data, bounds],
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
        bounds.from,
        bounds.to,
      ),
    [data, range, bounds],
  );

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Financeiro"
        description="O que entra (fee, projeto, edital), o imposto da nota e o que sai. O balanço é entradas − impostos − despesas."
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9"
              disabled={!data}
              onClick={() => setCompose("entrada")}
            >
              <Plus className="h-4 w-4" />
              Entrada
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
              Saída
            </Button>
            <PdfExportButton
              label="PDF"
              run={() => exportFinanceiroPdf(month)}
            />
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
              className="h-9 w-[13.5rem] rounded-md border border-border px-3"
            />
          </>
        }
      />

      {loading && !data ? (
        <div className="flex items-center justify-center py-16 text-text-2">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando o livro...
        </div>
      ) : null}

      {data ? (
        <>
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
              data.entries,
              bounds.from,
              bounds.to,
            )}
            periodLabel={period}
          />

          <Dialog
            open={compose != null}
            onOpenChange={(open) => {
              if (!open) setCompose(null);
            }}
          >
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {compose === "saida" ? "Lançar saída" : "Lançar entrada"}
                </DialogTitle>
                <DialogDescription>
                  {compose === "saida"
                    ? "Despesa do recorte. Entra no livro na data de competência."
                    : "Fee, projeto ou edital. Entra no livro na data de competência."}
                </DialogDescription>
              </DialogHeader>
              {compose === "entrada" ? (
                <IncomeForm
                  key="compose-entrada"
                  hideHeading
                  defaultDate={todayIso()}
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
                  key="compose-saida"
                  hideHeading
                  defaultDate={todayIso()}
                  categories={data.categories
                    .filter((category) => category.kind === "despesa")
                    .map((category) => ({
                      id: category.id,
                      name: category.name,
                    }))}
                  onSaved={() => {
                    setCompose(null);
                    void refresh();
                  }}
                  onCancel={() => setCompose(null)}
                />
              ) : null}
            </DialogContent>
          </Dialog>

          <div className="grid gap-4 xl:grid-cols-2">
            <MonthColumn
              title="Entradas"
              empty="Nenhuma entrada neste recorte. Use Entrada acima para lançar."
              lines={entradas}
              income
              clients={data.clients}
              categories={[]}
              onChanged={() => void refresh()}
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
              empty="Nenhuma despesa neste recorte. Use Saída acima para lançar."
              lines={saidas}
              income={false}
              clients={data.clients}
              categories={data.categories
                .filter((category) => category.kind === "despesa")
                .map((category) => ({
                  id: category.id,
                  name: category.name,
                }))}
              onChanged={() => void refresh()}
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

function MonthColumn({
  title,
  empty,
  lines,
  income,
  clients,
  categories,
  onChanged,
  onDelete,
}: {
  title: string;
  empty: string;
  lines: FinanceEntry[];
  income: boolean;
  clients: FinanceWorkspace["clients"];
  categories: Array<{ id: string; name: string }>;
  onChanged: () => void;
  onDelete: (id: string) => Promise<void>;
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
                      onClick={() => void onDelete(line.id)}
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

function IncomeForm({
  defaultDate,
  clients,
  initial,
  hideHeading = false,
  onSaved,
  onCancel,
}: {
  defaultDate: string;
  clients: FinanceWorkspace["clients"];
  initial?: FinanceEntry;
  hideHeading?: boolean;
  onSaved: () => void;
  onCancel?: () => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState<FinanceEntryOrigin>(
    initial?.origin ?? "fee_mensal",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(
    initial ? String(initial.amount).replace(".", ",") : "",
  );
  const [date, setDate] = useState(initial?.competenceDate ?? defaultDate);
  const [clientId, setClientId] = useState(initial?.relatedOrgId ?? "");
  const [taxRate, setTaxRate] = useState(
    initial ? String(initial.taxRate) : "6",
  );
  const [invoiceRef, setInvoiceRef] = useState(initial?.invoiceRef ?? "");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets date when switching between "novo" and "editar" on the same mounted form
    if (!initial) setDate(defaultDate);
  }, [defaultDate, initial]);

  const previewTax = taxOnInvoice(
    Number(amount.replace(",", ".")) || 0,
    Number(taxRate) || 0,
  );

  async function submit(): Promise<void> {
    setBusy(true);
    const payload = {
      kind: "entrada" as const,
      origin,
      status: "realizado" as const,
      amount,
      taxRate: Number(taxRate.replace(",", ".")) || 0,
      invoiceRef: invoiceRef || null,
      competenceDate: date,
      description:
        description.trim() ||
        `${ENTRY_ORIGIN_LABELS[origin]}${clientId ? "" : ""}`,
      relatedOrgId: clientId || null,
    };
    const result = initial
      ? await updateFinanceEntry({ ...payload, entryId: initial.id })
      : await createFinanceEntry(payload);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(initial ? "Entrada atualizada" : "Entrada lançada");
    if (!initial) {
      setDescription("");
      setAmount("");
      setInvoiceRef("");
    }
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
      {hideHeading ? null : (
        <p className="text-xs font-medium uppercase tracking-wide text-text-3">
          {initial ? "Editar entrada" : "Nova entrada"}
        </p>
      )}
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
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {initial ? "Salvar entrada" : "Lançar entrada"}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function ExpenseForm({
  defaultDate,
  categories,
  initial,
  hideHeading = false,
  onSaved,
  onCancel,
}: {
  defaultDate: string;
  categories: Array<{ id: string; name: string }>;
  initial?: FinanceEntry;
  hideHeading?: boolean;
  onSaved: () => void;
  onCancel?: () => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(
    initial ? String(initial.amount).replace(".", ",") : "",
  );
  const [date, setDate] = useState(initial?.competenceDate ?? defaultDate);
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets date when switching between "novo" and "editar" on the same mounted form
    if (!initial) setDate(defaultDate);
  }, [defaultDate, initial]);

  async function submit(): Promise<void> {
    setBusy(true);
    const categoryName =
      categories.find((category) => category.id === categoryId)?.name ?? "";
    const payload = {
      kind: "saida" as const,
      origin: "despesa" as const,
      status: "realizado" as const,
      amount,
      competenceDate: date,
      categoryId: categoryId || null,
      description: description.trim() || categoryName || "Despesa",
    };
    const result = initial
      ? await updateFinanceEntry({ ...payload, entryId: initial.id })
      : await createFinanceEntry(payload);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(initial ? "Despesa atualizada" : "Despesa lançada");
    if (!initial) {
      setDescription("");
      setAmount("");
    }
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
      {hideHeading ? null : (
        <p className="text-xs font-medium uppercase tracking-wide text-text-3">
          {initial ? "Editar despesa" : "Nova despesa"}
        </p>
      )}
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
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={busy} variant="outline">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {initial ? "Salvar saída" : "Lançar saída"}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
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
