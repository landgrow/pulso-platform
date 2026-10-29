"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import {
  createFinanceEntry,
  updateFinanceEntry,
} from "@/app/actions/financeiro";
import { taxOnInvoice } from "@/lib/financeiro/ledger";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MenuSelect } from "@/components/ui/menu-select";
import {
  ENTRY_ORIGIN_LABELS,
  INCOME_ORIGINS,
  type FinanceEntry,
  type FinanceEntryOrigin,
  type FinanceWorkspace,
} from "@/types/financeiro";

export function IncomeForm({
  defaultDate,
  clients,
  initial,
  hideHeading = false,
  defaultRealized = true,
  onSaved,
  onCancel,
}: {
  defaultDate: string;
  clients: FinanceWorkspace["clients"];
  initial?: FinanceEntry;
  hideHeading?: boolean;
  defaultRealized?: boolean;
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
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ?? initial?.competenceDate ?? defaultDate,
  );
  const [clientId, setClientId] = useState(initial?.relatedOrgId ?? "");
  const [taxRate, setTaxRate] = useState(
    initial && initial.taxRate > 0 ? String(initial.taxRate) : "",
  );
  const [invoiceRef, setInvoiceRef] = useState(initial?.invoiceRef ?? "");
  const [received, setReceived] = useState(
    initial ? initial.status === "realizado" : defaultRealized,
  );

  const previewTax = taxOnInvoice(
    Number(amount.replace(",", ".")) || 0,
    Number(taxRate.replace(",", ".")) || 0,
  );

  async function submit(): Promise<void> {
    setBusy(true);
    const payload = {
      kind: "entrada" as const,
      origin,
      status: received ? ("realizado" as const) : ("previsto" as const),
      amount,
      taxRate: Number(taxRate.replace(",", ".")) || 0,
      invoiceRef: invoiceRef || null,
      competenceDate: date,
      dueDate,
      description: description.trim() || ENTRY_ORIGIN_LABELS[origin],
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
    toast.success(initial ? "Conta atualizada" : "Conta a receber lançada");
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
          {initial ? "Editar a receber" : "Nova conta a receber"}
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
            placeholder="Ex: Fee JS Construtora · outubro"
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
        <Field label="Vencimento">
          <Input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </Field>
        <Field label="Competência">
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
            placeholder="só se a nota tiver imposto"
            inputMode="decimal"
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
      <label className="flex items-center gap-2 text-sm text-text-2">
        <input
          type="checkbox"
          checked={received}
          onChange={(event) => setReceived(event.target.checked)}
        />
        Já recebido
      </label>
      {previewTax > 0 ? (
        <p className="text-xs text-text-3">
          Imposto informado {formatCurrency(previewTax)} · líquido{" "}
          {formatCurrency((Number(amount.replace(",", ".")) || 0) - previewTax)}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {initial ? "Salvar" : "Lançar a receber"}
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

export function ExpenseForm({
  defaultDate,
  categories,
  initial,
  hideHeading = false,
  defaultRealized = true,
  onSaved,
  onCancel,
}: {
  defaultDate: string;
  categories: Array<{ id: string; name: string }>;
  initial?: FinanceEntry;
  hideHeading?: boolean;
  defaultRealized?: boolean;
  onSaved: () => void;
  onCancel?: () => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(
    initial ? String(initial.amount).replace(".", ",") : "",
  );
  const [date, setDate] = useState(initial?.competenceDate ?? defaultDate);
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ?? initial?.competenceDate ?? defaultDate,
  );
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [paid, setPaid] = useState(
    initial ? initial.status === "realizado" : defaultRealized,
  );

  async function submit(): Promise<void> {
    setBusy(true);
    const categoryName =
      categories.find((category) => category.id === categoryId)?.name ?? "";
    const payload = {
      kind: "saida" as const,
      origin: "despesa" as const,
      status: paid ? ("realizado" as const) : ("previsto" as const),
      amount,
      competenceDate: date,
      dueDate,
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
    toast.success(initial ? "Conta atualizada" : "Conta a pagar lançada");
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
          {initial ? "Editar a pagar" : "Nova conta a pagar"}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Categoria">
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
        <Field label="Vencimento">
          <Input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </Field>
        <Field label="Competência">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-text-2">
        <input
          type="checkbox"
          checked={paid}
          onChange={(event) => setPaid(event.target.checked)}
        />
        Já pago
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={busy} variant="outline">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {initial ? "Salvar" : "Lançar a pagar"}
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

export function Field({
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
