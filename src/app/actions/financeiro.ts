"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import {
  accountBalance,
  currentMonth,
  parseMoney,
  summarizeLedger,
  summarizeMonth,
  taxOnInvoice,
  todayIso,
} from "@/lib/financeiro/ledger";
import { PROGRAMA_CATEGORY_SLUG } from "@/types/financeiro";
import type {
  FinanceAccount,
  FinanceAccountKind,
  FinanceCategory,
  FinanceCategoryKind,
  FinanceClientOption,
  FinanceDeduction,
  FinanceDeductionKind,
  FinanceEntry,
  FinanceEntryKind,
  FinanceEntryOrigin,
  FinanceEntrySource,
  FinanceEntryStatus,
  FinanceInvoice,
  FinanceInvoiceKind,
  FinanceInvoiceStatus,
  FinanceMoeda,
  FinanceTax,
  FinanceTaxKind,
  FinanceTaxStatus,
  FinanceWorkspace,
} from "@/types/financeiro";
import type { Programa } from "@/types/clientes";

type Result<T> = { success: true; data: T } | { success: false; error: string };
type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

const MONEY_MISSING =
  "Tabelas financeiras não encontradas. Rode a migration 0025_gestao_financeira.sql.";

function isMissingRelation(
  error: { message?: string; code?: string } | null,
): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

function missingOr(error: { message?: string; code?: string } | null): string {
  if (isMissingRelation(error)) return MONEY_MISSING;
  return error?.message ?? "Erro no financeiro";
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function revalidateFinance(): void {
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/metricas");
  revalidatePath("/dashboard");
}

async function gate(): Promise<Result<ServerSupabase>> {
  const supabase = await createClient();
  try {
    await requireCapability(supabase, "financeiro");
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Acesso negado",
    };
  }
  return { success: true, data: supabase };
}

async function internalOrgId(
  supabase: ServerSupabase,
): Promise<Result<string>> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("is_internal", true)
    .maybeSingle();
  if (error || !data) {
    return {
      success: false,
      error:
        "Organização interna não encontrada. Rode a migration 0012_operacao_interna.sql.",
    };
  }
  return { success: true, data: data.id as string };
}

const moneySchema = z.preprocess(
  (value) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") return parseMoney(value);
    return Number.NaN;
  },
  z.number().finite().min(0, "Valor não pode ser negativo"),
);

const optionalUuid = z.preprocess((value) => {
  if (value === "" || value === undefined) return null;
  return value;
}, z.string().uuid().nullable());

const createEntrySchema = z.object({
  accountId: optionalUuid,
  categoryId: optionalUuid,
  kind: z.enum(["entrada", "saida"]),
  origin: z
    .enum(["fee_mensal", "projeto", "edital", "outros", "despesa"])
    .optional(),
  status: z.enum(["previsto", "realizado", "cancelado"]).default("realizado"),
  amount: moneySchema,
  taxRate: z.coerce.number().min(0).optional(),
  taxAmount: moneySchema.optional(),
  invoiceRef: z.string().nullable().optional(),
  competenceDate: z.string().min(8),
  dueDate: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  description: z.string().trim().min(1, "Descrição é obrigatória"),
  notes: z.string().nullable().optional(),
  relatedOrgId: optionalUuid,
});

const updateEntryStatusSchema = z.object({
  entryId: z.string().uuid(),
  status: z.enum(["previsto", "realizado", "cancelado"]),
  paidAt: z.string().nullable().optional(),
});

const createInvoiceSchema = z.object({
  number: z.string().trim().min(1, "Número da nota é obrigatório"),
  series: z.string().nullable().optional(),
  kind: z.enum(["nfe", "nfse", "nfce", "recibo"]).default("nfse"),
  status: z.enum(["rascunho", "emitida", "cancelada"]).default("emitida"),
  issueDate: z.string().min(8),
  amount: moneySchema,
  taxAmount: moneySchema.optional(),
  description: z.string().nullable().optional(),
  recipientOrgId: optionalUuid,
  createEntry: z.boolean().optional(),
  accountId: optionalUuid,
  categoryId: optionalUuid,
});

const createTaxSchema = z.object({
  kind: z.enum([
    "das",
    "iss",
    "irpj",
    "csll",
    "pis",
    "cofins",
    "inss",
    "outros",
  ]),
  periodStart: z.string().min(8),
  periodEnd: z.string().min(8),
  baseAmount: moneySchema,
  rate: z.coerce.number().min(0),
  amount: moneySchema,
  dueDate: z.string().min(8),
  status: z.enum(["previsto", "pago", "atrasado"]).default("previsto"),
  notes: z.string().nullable().optional(),
  createEntry: z.boolean().optional(),
  accountId: optionalUuid,
  categoryId: optionalUuid,
});

const createDeductionSchema = z.object({
  taxId: optionalUuid,
  kind: z.enum(["despesa_dedutivel", "credito", "isencao", "outros"]),
  description: z.string().trim().min(1),
  amount: moneySchema,
  periodStart: z.string().min(8),
  periodEnd: z.string().min(8),
});

const createAccountSchema = z.object({
  name: z.string().trim().min(1),
  kind: z.enum(["caixa", "banco", "cartao"]),
  bankName: z.string().nullable().optional(),
  initialBalance: moneySchema.optional(),
});

const createCategorySchema = z.object({
  name: z.string().trim().min(1),
  kind: z.enum(["receita", "despesa", "imposto", "deducao"]),
});

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function getReceitaCaixaBrl(): Promise<number> {
  const gated = await gate();
  if (!gated.success) return 0;
  const org = await internalOrgId(gated.data);
  if (!org.success) return 0;
  const { data, error } = await gated.data
    .from("finance_entries")
    .select("amount, kind, status, currency")
    .eq("org_id", org.data)
    .eq("kind", "entrada")
    .eq("status", "realizado")
    .eq("currency", "BRL");
  if (error) return 0;
  return ((data ?? []) as Array<{ amount: unknown }>).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0,
  );
}

export async function getFinanceWorkspace(
  month?: string,
): Promise<Result<FinanceWorkspace>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const supabase = gated.data;
  const org = await internalOrgId(supabase);
  if (!org.success) return org;

  const orgId = org.data;
  const today = todayIso();
  const selectedMonth =
    month && /^\d{4}-\d{2}$/.test(month) ? month : currentMonth();

  const [
    accountsRes,
    categoriesRes,
    entriesRes,
    invoicesRes,
    taxesRes,
    deductionsRes,
    clientsRes,
  ] = await Promise.all([
    supabase
      .from("finance_accounts")
      .select(
        "id, org_id, name, kind, bank_name, initial_balance, currency, archived",
      )
      .eq("org_id", orgId)
      .eq("archived", false)
      .order("name"),
    supabase
      .from("finance_categories")
      .select("id, org_id, name, slug, kind, is_system")
      .eq("org_id", orgId)
      .order("kind")
      .order("name"),
    supabase
      .from("finance_entries")
      .select(
        "id, org_id, account_id, category_id, kind, status, amount, currency, competence_date, due_date, paid_at, description, notes, source, related_org_id, related_contrato_id, related_invoice_id, related_tax_id, origin, tax_rate, tax_amount, invoice_ref",
      )
      .eq("org_id", orgId)
      .neq("status", "cancelado")
      .order("competence_date", { ascending: false })
      .limit(400),
    supabase
      .from("finance_invoices")
      .select(
        "id, org_id, number, series, kind, status, issue_date, amount, tax_amount, description, recipient_org_id, entry_id",
      )
      .eq("org_id", orgId)
      .order("issue_date", { ascending: false })
      .limit(200),
    supabase
      .from("finance_taxes")
      .select(
        "id, org_id, kind, period_start, period_end, base_amount, rate, amount, status, due_date, paid_at, notes, entry_id",
      )
      .eq("org_id", orgId)
      .order("due_date", { ascending: false })
      .limit(200),
    supabase
      .from("finance_deductions")
      .select(
        "id, org_id, tax_id, kind, description, amount, period_start, period_end, entry_id",
      )
      .eq("org_id", orgId)
      .order("period_start", { ascending: false })
      .limit(200),
    supabase
      .from("organizations")
      .select("id, name")
      .eq("is_internal", false)
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (isMissingRelation(accountsRes.error)) {
    return { success: false, error: MONEY_MISSING };
  }
  if (accountsRes.error)
    return { success: false, error: accountsRes.error.message };
  if (categoriesRes.error)
    return { success: false, error: categoriesRes.error.message };
  if (entriesRes.error)
    return { success: false, error: entriesRes.error.message };
  if (invoicesRes.error)
    return { success: false, error: invoicesRes.error.message };
  if (taxesRes.error) return { success: false, error: taxesRes.error.message };
  if (deductionsRes.error)
    return { success: false, error: deductionsRes.error.message };

  const categories = (
    (categoriesRes.data ?? []) as Array<{
      id: string;
      org_id: string;
      name: string;
      slug: string;
      kind: FinanceCategoryKind;
      is_system: boolean;
    }>
  ).map((row) => ({
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    isSystem: row.is_system,
  })) satisfies FinanceCategory[];

  const categoryById = new Map(categories.map((row) => [row.id, row]));
  const accountNameById = new Map(
    ((accountsRes.data ?? []) as Array<{ id: string; name: string }>).map(
      (row) => [row.id, row.name],
    ),
  );
  const clientNameById = new Map(
    ((clientsRes.data ?? []) as Array<{ id: string; name: string }>).map(
      (row) => [row.id, row.name],
    ),
  );

  const rawEntries = (entriesRes.data ?? []) as Array<{
    id: string;
    org_id: string;
    account_id: string | null;
    category_id: string | null;
    kind: FinanceEntryKind;
    status: FinanceEntryStatus;
    amount: unknown;
    currency: FinanceMoeda;
    competence_date: string;
    due_date: string | null;
    paid_at: string | null;
    description: string;
    notes: string | null;
    source: FinanceEntrySource;
    related_org_id: string | null;
    related_contrato_id: string | null;
    related_invoice_id: string | null;
    related_tax_id: string | null;
    origin?: FinanceEntryOrigin | null;
    tax_rate?: unknown;
    tax_amount?: unknown;
    invoice_ref?: string | null;
  }>;

  const entries: FinanceEntry[] = rawEntries.map((row) => ({
    id: row.id,
    orgId: row.org_id,
    accountId: row.account_id,
    categoryId: row.category_id,
    kind: row.kind,
    status: row.status,
    amount: toNumber(row.amount),
    currency: row.currency,
    competenceDate: row.competence_date,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    description: row.description,
    notes: row.notes,
    source: row.source,
    relatedOrgId: row.related_org_id,
    relatedContratoId: row.related_contrato_id,
    relatedInvoiceId: row.related_invoice_id,
    relatedTaxId: row.related_tax_id,
    origin: row.origin ?? (row.kind === "saida" ? "despesa" : "outros"),
    taxRate: toNumber(row.tax_rate),
    taxAmount: toNumber(row.tax_amount),
    invoiceRef: row.invoice_ref ?? null,
    accountName: row.account_id
      ? (accountNameById.get(row.account_id) ?? null)
      : null,
    categoryName: row.category_id
      ? (categoryById.get(row.category_id)?.name ?? null)
      : null,
    categoryKind: row.category_id
      ? (categoryById.get(row.category_id)?.kind ?? null)
      : null,
    relatedOrgName: row.related_org_id
      ? (clientNameById.get(row.related_org_id) ?? null)
      : null,
  }));

  const accounts: FinanceAccount[] = (
    (accountsRes.data ?? []) as Array<{
      id: string;
      org_id: string;
      name: string;
      kind: FinanceAccountKind;
      bank_name: string | null;
      initial_balance: unknown;
      currency: FinanceMoeda;
      archived: boolean;
    }>
  ).map((row) => ({
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    kind: row.kind,
    bankName: row.bank_name,
    initialBalance: toNumber(row.initial_balance),
    currency: row.currency,
    archived: row.archived,
    balance: accountBalance(
      toNumber(row.initial_balance),
      entries
        .filter((entry) => entry.accountId === row.id)
        .map((entry) => ({
          kind: entry.kind,
          status: entry.status,
          amount: entry.amount,
          competenceDate: entry.competenceDate,
          dueDate: entry.dueDate,
          paidAt: entry.paidAt,
          categoryKind: entry.categoryKind,
        })),
    ),
  }));

  const invoices: FinanceInvoice[] = (
    (invoicesRes.data ?? []) as Array<{
      id: string;
      org_id: string;
      number: string;
      series: string | null;
      kind: FinanceInvoiceKind;
      status: FinanceInvoiceStatus;
      issue_date: string;
      amount: unknown;
      tax_amount: unknown;
      description: string | null;
      recipient_org_id: string | null;
      entry_id: string | null;
    }>
  ).map((row) => ({
    id: row.id,
    orgId: row.org_id,
    number: row.number,
    series: row.series,
    kind: row.kind,
    status: row.status,
    issueDate: row.issue_date,
    amount: toNumber(row.amount),
    taxAmount: toNumber(row.tax_amount),
    description: row.description,
    recipientOrgId: row.recipient_org_id,
    recipientName: row.recipient_org_id
      ? (clientNameById.get(row.recipient_org_id) ?? null)
      : null,
    entryId: row.entry_id,
  }));

  const taxes: FinanceTax[] = (
    (taxesRes.data ?? []) as Array<{
      id: string;
      org_id: string;
      kind: FinanceTaxKind;
      period_start: string;
      period_end: string;
      base_amount: unknown;
      rate: unknown;
      amount: unknown;
      status: FinanceTaxStatus;
      due_date: string;
      paid_at: string | null;
      notes: string | null;
      entry_id: string | null;
    }>
  ).map((row) => ({
    id: row.id,
    orgId: row.org_id,
    kind: row.kind,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    baseAmount: toNumber(row.base_amount),
    rate: toNumber(row.rate),
    amount: toNumber(row.amount),
    status: row.status,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    notes: row.notes,
    entryId: row.entry_id,
  }));

  const deductions: FinanceDeduction[] = (
    (deductionsRes.data ?? []) as Array<{
      id: string;
      org_id: string;
      tax_id: string | null;
      kind: FinanceDeductionKind;
      description: string;
      amount: unknown;
      period_start: string;
      period_end: string;
      entry_id: string | null;
    }>
  ).map((row) => ({
    id: row.id,
    orgId: row.org_id,
    taxId: row.tax_id,
    kind: row.kind,
    description: row.description,
    amount: toNumber(row.amount),
    periodStart: row.period_start,
    periodEnd: row.period_end,
    entryId: row.entry_id,
  }));

  const clients: FinanceClientOption[] = (
    (clientsRes.data ?? []) as Array<{ id: string; name: string }>
  ).map((row) => ({ orgId: row.id, name: row.name }));

  const monthBalance = summarizeMonth(
    entries.map((entry) => ({
      kind: entry.kind,
      status: entry.status,
      amount: entry.amount,
      taxAmount: entry.taxAmount,
      competenceDate: entry.competenceDate,
    })),
    selectedMonth,
  );

  const summary = summarizeLedger({
    today,
    month: selectedMonth,
    accountBalances: accounts.map((account) => account.balance),
    entries: entries.map((entry) => ({
      kind: entry.kind,
      status: entry.status,
      amount: entry.amount,
      competenceDate: entry.competenceDate,
      dueDate: entry.dueDate,
      paidAt: entry.paidAt,
      categoryKind: entry.categoryKind,
    })),
    taxes: taxes.map((tax) => ({
      amount: tax.amount,
      status: tax.status,
      dueDate: tax.dueDate,
      periodStart: tax.periodStart,
      hasEntry: Boolean(tax.entryId),
    })),
    deductions: deductions.map((row) => ({
      amount: row.amount,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
    })),
  });

  return {
    success: true,
    data: {
      orgId,
      month: selectedMonth,
      today,
      summary,
      monthBalance,
      accounts,
      categories,
      entries,
      invoices,
      taxes,
      deductions,
      clients,
    },
  };
}

async function currentUserId(supabase: ServerSupabase): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function createFinanceEntry(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = createEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;
  const userId = await currentUserId(gated.data);
  const origin =
    parsed.data.origin ?? (parsed.data.kind === "saida" ? "despesa" : "outros");
  const taxRate =
    parsed.data.kind === "entrada" ? (parsed.data.taxRate ?? 0) : 0;
  const taxAmount =
    parsed.data.kind === "entrada"
      ? taxOnInvoice(parsed.data.amount, taxRate, parsed.data.taxAmount ?? null)
      : 0;
  const paidAt =
    parsed.data.status === "realizado"
      ? parsed.data.paidAt || parsed.data.competenceDate
      : parsed.data.paidAt || null;

  const { data, error } = await gated.data
    .from("finance_entries")
    .insert({
      org_id: org.data,
      account_id: parsed.data.accountId,
      category_id: parsed.data.categoryId,
      kind: parsed.data.kind,
      origin,
      status: parsed.data.status,
      amount: parsed.data.amount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      invoice_ref: parsed.data.invoiceRef || null,
      competence_date: parsed.data.competenceDate,
      due_date: parsed.data.dueDate || parsed.data.competenceDate,
      paid_at: paidAt,
      description: parsed.data.description,
      notes: parsed.data.notes || null,
      related_org_id: parsed.data.relatedOrgId,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: missingOr(error) };
  }
  revalidateFinance();
  return { success: true, data: { id: data.id as string } };
}

export async function updateFinanceEntryStatus(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = updateEntryStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const paidAt =
    parsed.data.status === "realizado"
      ? parsed.data.paidAt || todayIso()
      : null;
  const { data, error } = await gated.data
    .from("finance_entries")
    .update({ status: parsed.data.status, paid_at: paidAt })
    .eq("id", parsed.data.entryId)
    .select("id")
    .single();
  if (error || !data) {
    return { success: false, error: missingOr(error) };
  }
  revalidateFinance();
  return { success: true, data: { id: data.id as string } };
}

export async function deleteFinanceEntry(
  entryId: string,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = z.string().uuid().safeParse(entryId);
  if (!parsed.success) {
    return { success: false, error: "Lançamento inválido" };
  }
  const { error } = await gated.data
    .from("finance_entries")
    .delete()
    .eq("id", parsed.data);
  if (error) return { success: false, error: missingOr(error) };
  revalidateFinance();
  return { success: true, data: { id: parsed.data } };
}

export async function createFinanceInvoice(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = createInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;
  const userId = await currentUserId(gated.data);

  const { data, error } = await gated.data
    .from("finance_invoices")
    .insert({
      org_id: org.data,
      number: parsed.data.number,
      series: parsed.data.series || null,
      kind: parsed.data.kind,
      status: parsed.data.status,
      issue_date: parsed.data.issueDate,
      amount: parsed.data.amount,
      tax_amount: parsed.data.taxAmount ?? 0,
      description: parsed.data.description || null,
      recipient_org_id: parsed.data.recipientOrgId,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { success: false, error: missingOr(error) };
  }

  if (parsed.data.createEntry && parsed.data.status !== "cancelada") {
    const { data: entry, error: entryError } = await gated.data
      .from("finance_entries")
      .insert({
        org_id: org.data,
        account_id: parsed.data.accountId,
        category_id: parsed.data.categoryId,
        kind: "entrada",
        status: parsed.data.status === "emitida" ? "previsto" : "previsto",
        amount: parsed.data.amount,
        competence_date: parsed.data.issueDate,
        due_date: parsed.data.issueDate,
        description: `Nota ${parsed.data.kind.toUpperCase()} ${parsed.data.number}`,
        source: "nota",
        related_org_id: parsed.data.recipientOrgId,
        related_invoice_id: data.id,
        created_by: userId,
      })
      .select("id")
      .single();
    if (!entryError && entry) {
      await gated.data
        .from("finance_invoices")
        .update({ entry_id: entry.id })
        .eq("id", data.id);
    }
  }

  revalidateFinance();
  return { success: true, data: { id: data.id as string } };
}

export async function createFinanceTax(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = createTaxSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;
  const userId = await currentUserId(gated.data);
  const paidAt = parsed.data.status === "pago" ? parsed.data.dueDate : null;

  const { data, error } = await gated.data
    .from("finance_taxes")
    .insert({
      org_id: org.data,
      kind: parsed.data.kind,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      base_amount: parsed.data.baseAmount,
      rate: parsed.data.rate,
      amount: parsed.data.amount,
      status: parsed.data.status,
      due_date: parsed.data.dueDate,
      paid_at: paidAt,
      notes: parsed.data.notes || null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { success: false, error: missingOr(error) };
  }

  if (parsed.data.createEntry) {
    const { data: entry, error: entryError } = await gated.data
      .from("finance_entries")
      .insert({
        org_id: org.data,
        account_id: parsed.data.accountId,
        category_id: parsed.data.categoryId,
        kind: "saida",
        status: parsed.data.status === "pago" ? "realizado" : "previsto",
        amount: parsed.data.amount,
        competence_date: parsed.data.periodStart,
        due_date: parsed.data.dueDate,
        paid_at: paidAt,
        description: `Imposto ${parsed.data.kind.toUpperCase()}`,
        source: "imposto",
        related_tax_id: data.id,
        created_by: userId,
      })
      .select("id")
      .single();
    if (!entryError && entry) {
      await gated.data
        .from("finance_taxes")
        .update({ entry_id: entry.id })
        .eq("id", data.id);
    }
  }

  revalidateFinance();
  return { success: true, data: { id: data.id as string } };
}

export async function createFinanceDeduction(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = createDeductionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;
  const userId = await currentUserId(gated.data);
  const { data, error } = await gated.data
    .from("finance_deductions")
    .insert({
      org_id: org.data,
      tax_id: parsed.data.taxId,
      kind: parsed.data.kind,
      description: parsed.data.description,
      amount: parsed.data.amount,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { success: false, error: missingOr(error) };
  }
  revalidateFinance();
  return { success: true, data: { id: data.id as string } };
}

export async function createFinanceAccount(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = createAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;
  const { data, error } = await gated.data
    .from("finance_accounts")
    .insert({
      org_id: org.data,
      name: parsed.data.name,
      kind: parsed.data.kind,
      bank_name: parsed.data.bankName || null,
      initial_balance: parsed.data.initialBalance ?? 0,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { success: false, error: missingOr(error) };
  }
  revalidateFinance();
  return { success: true, data: { id: data.id as string } };
}

export async function createFinanceCategory(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = createCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;
  const slug = `${parsed.data.kind}-${slugify(parsed.data.name)}`;
  const { data, error } = await gated.data
    .from("finance_categories")
    .insert({
      org_id: org.data,
      name: parsed.data.name,
      slug,
      kind: parsed.data.kind,
      is_system: false,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { success: false, error: missingOr(error) };
  }
  revalidateFinance();
  return { success: true, data: { id: data.id as string } };
}

export async function syncReceivableFromContrato(input: {
  contratoId: string;
  clienteId: string;
  programa: Programa;
  valor: number;
  moeda: FinanceMoeda;
  dataInicio: string;
}): Promise<void> {
  const supabase = await createClient();
  try {
    await requireCapability(supabase, "financeiro");
  } catch {
    return;
  }
  const org = await internalOrgId(supabase);
  if (!org.success) return;

  const [{ data: cliente }, { data: category }, { data: account }] =
    await Promise.all([
      supabase
        .from("clientes")
        .select("org_id")
        .eq("id", input.clienteId)
        .maybeSingle(),
      supabase
        .from("finance_categories")
        .select("id")
        .eq("org_id", org.data)
        .eq("slug", PROGRAMA_CATEGORY_SLUG[input.programa] ?? "receita-outros")
        .maybeSingle(),
      supabase
        .from("finance_accounts")
        .select("id")
        .eq("org_id", org.data)
        .eq("archived", false)
        .order("kind")
        .limit(1)
        .maybeSingle(),
    ]);

  const { error } = await supabase.from("finance_entries").insert({
    org_id: org.data,
    account_id: account?.id ?? null,
    category_id: category?.id ?? null,
    kind: "entrada",
    status: "previsto",
    amount: input.valor,
    currency: input.moeda,
    competence_date: input.dataInicio,
    due_date: input.dataInicio,
    description: `Contrato ${input.programa.toUpperCase()}`,
    source: "contrato",
    origin:
      input.programa === "scale" || input.programa === "conselho"
        ? "fee_mensal"
        : "projeto",
    related_org_id: (cliente?.org_id as string | undefined) ?? null,
    related_contrato_id: input.contratoId,
  });
  if (
    error &&
    !isMissingRelation(error) &&
    !error.message.includes("idx_finance_entries_contrato")
  ) {
    console.warn("[financeiro] contrato→a receber:", error.message);
  }
  revalidateFinance();
}
