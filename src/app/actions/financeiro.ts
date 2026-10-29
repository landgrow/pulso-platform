"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPlatformRole,
  requireAnyCapability,
  requireCapability,
} from "@/lib/supabase/platform-role-server";
import {
  accountBalance,
  currentMonth,
  parseMoney,
  summarizeLedger,
  summarizeMonth,
  addMonthsIso,
  contractCompetenceDates,
  contractDueState,
  contractEndFromMonths,
  contractMonthCount,
  dealAmountFromCustom,
  defaultMonthsForPrograma,
  dueDateForMonth,
  isMonthlyPrograma,
  qualifiesCrmCashInbox,
  taxOnInvoice,
  todayIso,
} from "@/lib/financeiro/ledger";
import {
  financeEntryFingerprint,
  reviewFinanceCsv,
  type FinanceImportReview,
  type FinanceImportRow,
} from "@/lib/financeiro/import-csv";
import { PROGRAMA_CATEGORY_SLUG } from "@/types/financeiro";
import type {
  FinanceAccount,
  FinanceAccountKind,
  FinanceCategory,
  FinanceCategoryKind,
  FinanceClientOption,
  FinanceContractRow,
  FinanceDeduction,
  FinanceDeductionKind,
  FinanceEntry,
  FinanceEntryKind,
  FinanceEntryOrigin,
  FinanceEntrySource,
  FinanceEntryStatus,
  FinanceFixedCost,
  FinanceInboxItem,
  FinanceInvoice,
  FinanceInvoiceKind,
  FinanceInvoiceStatus,
  FinanceMoeda,
  FinanceOrgRow,
  FinanceRecorrencia,
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
  revalidatePath("/admin/clientes");
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

const updateEntrySchema = createEntrySchema.extend({
  entryId: z.string().uuid(),
});

const createInvoiceSchema = z.object({
  number: z.string().trim().min(1, "Número da nota é obrigatório"),
  series: z.string().nullable().optional(),
  kind: z.enum(["nfe", "nfse", "nfce", "recibo"]).default("nfse"),
  status: z.enum(["rascunho", "emitida", "cancelada"]).default("rascunho"),
  filePath: z.string().max(500).nullable().optional(),
  fileName: z.string().max(240).nullable().optional(),
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
  year?: number,
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
  const selectedYear =
    year && year >= 2000 && year <= new Date().getFullYear() + 1
      ? year
      : Number(selectedMonth.slice(0, 4));

  await ensureFixedCostPayables(supabase, orgId);

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
      .gte("competence_date", `${selectedYear - 1}-01-01`)
      .lte("competence_date", `${selectedYear}-12-31`)
      .order("competence_date", { ascending: false })
      .limit(2000),
    supabase
      .from("finance_invoices")
      .select(
        "id, org_id, number, series, kind, status, issue_date, amount, tax_amount, description, recipient_org_id, entry_id, file_path, file_name",
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
      file_path?: string | null;
      file_name?: string | null;
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
    filePath: row.file_path ?? null,
    fileName: row.file_name ?? null,
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

  const admin = await createAdminClient();
  const [portfolio, inbox, fixedCosts] = await Promise.all([
    loadFinancePortfolio(admin, entries, today),
    loadFinanceInbox(admin, supabase, orgId),
    loadFinanceFixedCosts(supabase, orgId),
  ]);

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
      orgs: portfolio.orgs,
      contracts: portfolio.contracts,
      fixedCosts,
      inbox,
    },
  };
}

function mapContractRow(
  row: {
    id: string;
    cliente_id: string;
    programa: string;
    valor: unknown;
    moeda?: FinanceMoeda | null;
    data_inicio: string;
    data_fim: string | null;
    status: string;
    recorrencia?: FinanceRecorrencia | null;
  },
  orgId: string | null,
  orgName: string,
  entries: FinanceEntry[],
  today: string,
): FinanceContractRow {
  const related = entries.filter((entry) => entry.relatedContratoId === row.id);
  const dataInicio = String(row.data_inicio).slice(0, 10);
  const dataFim = row.data_fim ? String(row.data_fim).slice(0, 10) : null;
  const recorrencia =
    row.recorrencia ??
    (isMonthlyPrograma(String(row.programa)) ? "mensal" : "unico");
  const meses =
    dataFim != null
      ? contractMonthCount(dataInicio, dataFim)
      : defaultMonthsForPrograma(String(row.programa));
  return {
    id: row.id,
    clienteId: row.cliente_id,
    orgId,
    orgName,
    programa: row.programa,
    valor: toNumber(row.valor),
    moeda: row.moeda ?? "BRL",
    dataInicio,
    dataFim,
    meses,
    status: row.status,
    recorrencia,
    dueState: contractDueState(today, dataFim),
    geradas: related.length,
    abertas: related.filter((entry) => entry.status === "previsto").length,
    recebidas: related.filter((entry) => entry.status === "realizado").length,
    parcelas: related
      .map((entry) => ({
        id: entry.id,
        competenceDate: entry.competenceDate,
        status: entry.status,
        amount: entry.amount,
      }))
      .sort((a, b) => a.competenceDate.localeCompare(b.competenceDate)),
  };
}

async function loadFinancePortfolio(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  entries: FinanceEntry[],
  today: string,
): Promise<{ orgs: FinanceOrgRow[]; contracts: FinanceContractRow[] }> {
  const [{ data: orgsData }, { data: clientesData }, { data: contratosData }] =
    await Promise.all([
      admin
        .from("organizations")
        .select("id, name, deleted_at, is_internal")
        .eq("is_internal", false)
        .order("name"),
      admin.from("clientes").select("id, org_id, nome"),
      admin
        .from("contratos")
        .select(
          "id, cliente_id, programa, valor, moeda, data_inicio, data_fim, status, recorrencia",
        )
        .order("data_inicio", { ascending: false }),
    ]);

  const clientes = (clientesData ?? []) as Array<{
    id: string;
    org_id: string;
    nome: string;
  }>;
  const clienteByOrg = new Map(clientes.map((row) => [row.org_id, row]));
  const contratosByCliente = new Map<string, typeof contratosData>();
  for (const contrato of contratosData ?? []) {
    const clienteId = contrato.cliente_id as string;
    const list = contratosByCliente.get(clienteId) ?? [];
    list.push(contrato);
    contratosByCliente.set(clienteId, list);
  }

  const contracts: FinanceContractRow[] = [];
  const orgs: FinanceOrgRow[] = (
    (orgsData ?? []) as Array<{
      id: string;
      name: string;
      deleted_at: string | null;
    }>
  ).map((org) => {
    const cliente = clienteByOrg.get(org.id);
    const rows = cliente
      ? (contratosByCliente.get(cliente.id) ?? []).map((row) =>
          mapContractRow(
            {
              id: row.id as string,
              cliente_id: row.cliente_id as string,
              programa: String(row.programa),
              valor: row.valor,
              moeda: row.moeda as FinanceMoeda | null,
              data_inicio: String(row.data_inicio),
              data_fim: row.data_fim ? String(row.data_fim) : null,
              status: String(row.status),
              recorrencia: row.recorrencia as FinanceRecorrencia | null,
            },
            org.id,
            org.name,
            entries,
            today,
          ),
        )
      : [];
    contracts.push(...rows);
    return {
      orgId: org.id,
      clienteId: cliente?.id ?? null,
      orgName: org.name,
      deleted: Boolean(org.deleted_at),
      contratos: rows,
    };
  });

  return { orgs, contracts };
}

function nestedLabel(
  value:
    | { label?: string; name?: string; module?: string }
    | { label?: string; name?: string; module?: string }[]
    | null,
  key: "label" | "name",
): string {
  const row = Array.isArray(value) ? value[0] : value;
  return row?.[key] ?? "";
}

async function loadFinanceInbox(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  supabase: ServerSupabase,
  orgId: string,
): Promise<FinanceInboxItem[]> {
  const [{ data: cards }, { data: ignored }, { data: posted }] =
    await Promise.all([
      admin
        .from("board_cards")
        .select(
          "id, titulo, prazo, related_org_id, custom_values, boards!inner(module, name), board_columns!inner(label)",
        )
        .eq("boards.module", "crm")
        .limit(200),
      supabase.from("finance_inbox_ignore").select("card_id"),
      supabase
        .from("finance_entries")
        .select("related_card_id")
        .eq("org_id", orgId)
        .eq("source", "crm")
        .not("related_card_id", "is", null),
    ]);
  if (!cards) return [];
  const skip = new Set<string>([
    ...((ignored ?? []) as Array<{ card_id: string }>).map(
      (row) => row.card_id,
    ),
    ...((posted ?? []) as Array<{ related_card_id: string | null }>)
      .map((row) => row.related_card_id)
      .filter((id): id is string => Boolean(id)),
  ]);
  const orgIds = [
    ...new Set(
      cards
        .map((row) => row.related_org_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const orgName = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: orgs } = await admin
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);
    for (const org of orgs ?? []) {
      orgName.set(org.id as string, org.name as string);
    }
  }
  const inbox: FinanceInboxItem[] = [];
  for (const row of cards) {
    const id = row.id as string;
    if (skip.has(id)) continue;
    const board = nestedLabel(
      row.boards as { name?: string } | { name?: string }[] | null,
      "name",
    );
    const column = nestedLabel(
      row.board_columns as { label?: string } | { label?: string }[] | null,
      "label",
    );
    const amount = dealAmountFromCustom(
      (row.custom_values as Record<string, unknown> | null) ?? null,
    );
    if (!qualifiesCrmCashInbox({ board, column, amount })) continue;
    const relatedOrgId = row.related_org_id as string | null;
    inbox.push({
      id,
      title: row.titulo as string,
      column,
      relatedOrgId,
      orgName: relatedOrgId ? (orgName.get(relatedOrgId) ?? null) : null,
      dueOn: row.prazo ? String(row.prazo).slice(0, 10) : null,
      amount: amount ?? 0,
    });
  }
  return inbox;
}

async function loadFinanceFixedCosts(
  supabase: ServerSupabase,
  orgId: string,
): Promise<FinanceFixedCost[]> {
  const { data, error } = await supabase
    .from("finance_fixed_costs")
    .select("id, org_id, description, amount, due_day, category_id, active")
    .eq("org_id", orgId)
    .order("due_day");
  if (error || !data) return [];
  return (
    data as Array<{
      id: string;
      org_id: string;
      description: string;
      amount: unknown;
      due_day: number;
      category_id: string | null;
      active: boolean;
    }>
  ).map((row) => ({
    id: row.id,
    orgId: row.org_id,
    description: row.description,
    amount: toNumber(row.amount),
    dueDay: Number(row.due_day),
    categoryId: row.category_id,
    active: Boolean(row.active),
  }));
}

async function ensureFixedCostPayables(
  supabase: ServerSupabase,
  orgId: string,
): Promise<void> {
  const [{ data: costs }, { data: account }, { data: existing }] =
    await Promise.all([
      supabase
        .from("finance_fixed_costs")
        .select("id, description, amount, due_day, category_id, active")
        .eq("org_id", orgId)
        .eq("active", true),
      supabase
        .from("finance_accounts")
        .select("id")
        .eq("org_id", orgId)
        .eq("archived", false)
        .order("kind")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("finance_entries")
        .select("related_fixed_cost_id, competence_date")
        .eq("org_id", orgId)
        .eq("source", "fixo"),
    ]);
  if (!costs || costs.length === 0) return;
  const already = new Set(
    (existing ?? []).map(
      (row: {
        related_fixed_cost_id: string | null;
        competence_date: string;
      }) =>
        `${row.related_fixed_cost_id}:${String(row.competence_date).slice(0, 10)}`,
    ),
  );
  const today = todayIso();
  const months = [0, 1, 2].map((offset) =>
    addMonthsIso(today, offset).slice(0, 7),
  );
  const rows = [];
  for (const cost of costs) {
    for (const month of months) {
      const date = dueDateForMonth(month, Number(cost.due_day));
      const key = `${cost.id as string}:${date}`;
      if (already.has(key)) continue;
      rows.push({
        org_id: orgId,
        account_id: account?.id ?? null,
        category_id: cost.category_id ?? null,
        kind: "saida" as const,
        status: "previsto" as const,
        amount: toNumber(cost.amount),
        competence_date: date,
        due_date: date,
        description: `${cost.description as string} · ${month}`,
        source: "fixo" as const,
        origin: "despesa" as const,
        related_fixed_cost_id: cost.id,
      });
    }
  }
  if (rows.length === 0) return;
  const { error } = await supabase.from("finance_entries").insert(rows);
  if (error && !isMissingRelation(error)) {
    console.warn("[financeiro] despesa fixa→a pagar:", error.message);
  }
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

export async function updateFinanceEntry(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = updateEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
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
    .update({
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
    })
    .eq("id", parsed.data.entryId)
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
      file_path: parsed.data.filePath || null,
      file_name: parsed.data.fileName || null,
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

const NOTA_BUCKET = "evidencias";

export async function createFinanceInvoiceUploadUrl(
  fileName: string,
  size: number,
): Promise<Result<{ path: string; token: string; name: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;
  const safe = fileName.replace(/[^\w.\- ()]+/g, "_").slice(0, 120);
  if (!safe) return { success: false, error: "Nome de arquivo inválido." };
  if (size <= 0) return { success: false, error: "O arquivo está vazio." };
  if (size > 20 * 1024 * 1024) {
    return { success: false, error: "Arquivo maior que 20 MB." };
  }
  const path = `${org.data}/financeiro/notas/${crypto.randomUUID()}-${safe}`;
  const admin = await createAdminClient();
  const { data, error } = await admin.storage
    .from(NOTA_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    return { success: false, error: "Não consegui preparar o envio da nota." };
  }
  return {
    success: true,
    data: { path: data.path, token: data.token, name: safe },
  };
}

export async function getFinanceInvoiceFileUrl(
  path: string,
): Promise<Result<{ url: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;
  if (!path.startsWith(`${org.data}/financeiro/notas/`)) {
    return { success: false, error: "Arquivo inválido." };
  }
  const admin = await createAdminClient();
  const { data, error } = await admin.storage
    .from(NOTA_BUCKET)
    .createSignedUrl(path, 300);
  if (error || !data) {
    return { success: false, error: "Arquivo não encontrado." };
  }
  return { success: true, data: { url: data.signedUrl } };
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
  dataFim?: string | null;
  recorrencia?: FinanceRecorrencia;
}): Promise<void> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  if (role !== "platform_admin") {
    try {
      await requireCapability(supabase, "financeiro");
    } catch {
      return;
    }
  }
  const org = await internalOrgId(supabase);
  if (!org.success) return;
  await insertContractReceivables(org.data, {
    ...input,
    dataFim: input.dataFim ?? null,
    recorrencia:
      input.recorrencia ??
      (isMonthlyPrograma(input.programa) ? "mensal" : "unico"),
  });
  revalidateFinance();
}

export async function generateContractReceivables(
  contratoId: string,
): Promise<Result<{ created: number }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = z.string().uuid().safeParse(contratoId);
  if (!parsed.success) return { success: false, error: "Contrato inválido." };
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;
  const admin = await createAdminClient();
  const { data: contrato, error } = await admin
    .from("contratos")
    .select(
      "id, cliente_id, programa, valor, moeda, data_inicio, data_fim, recorrencia, status",
    )
    .eq("id", parsed.data)
    .maybeSingle();
  if (error || !contrato) {
    return { success: false, error: "Contrato não encontrado." };
  }
  if (contrato.status === "encerrado") {
    return { success: false, error: "Contrato encerrado." };
  }
  const created = await insertContractReceivables(org.data, {
    contratoId: contrato.id as string,
    clienteId: contrato.cliente_id as string,
    programa: contrato.programa as Programa,
    valor: toNumber(contrato.valor),
    moeda: (contrato.moeda as FinanceMoeda | undefined) ?? "BRL",
    dataInicio: String(contrato.data_inicio).slice(0, 10),
    dataFim: contrato.data_fim ? String(contrato.data_fim).slice(0, 10) : null,
    recorrencia:
      (contrato.recorrencia as FinanceRecorrencia | null) ??
      (isMonthlyPrograma(String(contrato.programa)) ? "mensal" : "unico"),
  });
  revalidateFinance();
  return { success: true, data: { created } };
}

const createFinanceContractSchema = z.object({
  orgId: z.string().uuid(),
  programa: z.enum(["bin", "scale", "conselho", "foco"]),
  valor: moneySchema,
  meses: z.coerce.number().int().min(1).max(60),
  dataInicio: z.string().min(8),
});

export async function createFinanceContract(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = createFinanceContractSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;
  const admin = await createAdminClient();
  const { orgId, programa, valor, meses, dataInicio } = parsed.data;
  const dataFim = contractEndFromMonths(dataInicio, meses);
  const recorrencia: FinanceRecorrencia = isMonthlyPrograma(programa)
    ? "mensal"
    : "unico";

  let { data: cliente } = await admin
    .from("clientes")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();
  if (!cliente) {
    const { data: orgRow } = await admin
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .maybeSingle();
    const inserted = await admin
      .from("clientes")
      .insert({ org_id: orgId, nome: orgRow?.name ?? "Cliente" })
      .select("id")
      .single();
    if (inserted.error || !inserted.data) {
      return {
        success: false,
        error: inserted.error?.message ?? "Não foi possível criar o cliente.",
      };
    }
    cliente = inserted.data;
  }

  const userId = await currentUserId(gated.data);
  const { data, error } = await admin
    .from("contratos")
    .insert({
      cliente_id: cliente.id,
      programa,
      valor,
      moeda: "BRL",
      data_inicio: dataInicio,
      data_fim: dataFim,
      recorrencia,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.message?.includes("idx_contratos_ativo_unico")) {
      return {
        success: false,
        error: "Já existe um contrato ativo desse programa para este cliente.",
      };
    }
    return {
      success: false,
      error: error?.message ?? "Erro ao criar contrato",
    };
  }

  await insertContractReceivables(org.data, {
    contratoId: data.id as string,
    clienteId: cliente.id as string,
    programa,
    valor,
    moeda: "BRL",
    dataInicio,
    dataFim,
    recorrencia,
  });
  revalidateFinance();
  return { success: true, data: { id: data.id as string } };
}

const createFixedCostSchema = z.object({
  description: z.string().trim().min(1, "Descrição é obrigatória"),
  amount: moneySchema,
  dueDay: z.coerce.number().int().min(1).max(28),
  categoryId: optionalUuid,
});

export async function createFinanceFixedCost(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = createFixedCostSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;
  const { data, error } = await gated.data
    .from("finance_fixed_costs")
    .insert({
      org_id: org.data,
      description: parsed.data.description,
      amount: parsed.data.amount,
      due_day: parsed.data.dueDay,
      category_id: parsed.data.categoryId,
      active: true,
    })
    .select("id")
    .single();
  if (error || !data) return { success: false, error: missingOr(error) };
  await ensureFixedCostPayables(gated.data, org.data);
  revalidateFinance();
  return { success: true, data: { id: data.id as string } };
}

export async function archiveFinanceFixedCost(
  id: string,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { success: false, error: "Despesa inválida." };
  const { error } = await gated.data
    .from("finance_fixed_costs")
    .update({ active: false })
    .eq("id", parsed.data);
  if (error) return { success: false, error: missingOr(error) };
  revalidateFinance();
  return { success: true, data: { id: parsed.data } };
}

export async function confirmCrmCashInbox(
  cardId: string,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = z.string().uuid().safeParse(cardId);
  if (!parsed.success) return { success: false, error: "Card inválido." };
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;
  const admin = await createAdminClient();
  const { data: card, error } = await admin
    .from("board_cards")
    .select(
      "id, titulo, related_org_id, custom_values, boards!inner(module, name), board_columns!inner(label)",
    )
    .eq("id", parsed.data)
    .maybeSingle();
  if (error || !card) return { success: false, error: "Card não encontrado." };
  const board = nestedLabel(
    card.boards as { name?: string } | { name?: string }[] | null,
    "name",
  );
  const column = nestedLabel(
    card.board_columns as { label?: string } | { label?: string }[] | null,
    "label",
  );
  const amount = dealAmountFromCustom(
    (card.custom_values as Record<string, unknown> | null) ?? null,
  );
  if (!qualifiesCrmCashInbox({ board, column, amount })) {
    return {
      success: false,
      error: "Só entra no caixa card ganho do board Clientes com valor.",
    };
  }
  const { data: existing } = await gated.data
    .from("finance_entries")
    .select("id")
    .eq("related_card_id", parsed.data)
    .eq("source", "crm")
    .maybeSingle();
  if (existing) return { success: true, data: { id: existing.id as string } };

  const { data: account } = await gated.data
    .from("finance_accounts")
    .select("id")
    .eq("org_id", org.data)
    .eq("archived", false)
    .order("kind")
    .limit(1)
    .maybeSingle();
  const today = todayIso();
  const { data, error: insertError } = await gated.data
    .from("finance_entries")
    .insert({
      org_id: org.data,
      account_id: account?.id ?? null,
      kind: "entrada",
      status: "realizado",
      amount: amount ?? 0,
      competence_date: today,
      due_date: today,
      paid_at: today,
      description: `CRM · ${card.titulo as string}`,
      source: "crm",
      origin: "projeto",
      related_org_id: (card.related_org_id as string | null) ?? null,
      related_card_id: parsed.data,
    })
    .select("id")
    .single();
  if (insertError || !data) {
    return { success: false, error: missingOr(insertError) };
  }
  revalidateFinance();
  return { success: true, data: { id: data.id as string } };
}

export async function ignoreCrmCashInbox(
  cardId: string,
): Promise<Result<{ id: string }>> {
  const gated = await gate();
  if (!gated.success) return gated;
  const parsed = z.string().uuid().safeParse(cardId);
  if (!parsed.success) return { success: false, error: "Card inválido." };
  const userId = await currentUserId(gated.data);
  const { error } = await gated.data.from("finance_inbox_ignore").upsert({
    card_id: parsed.data,
    ignored_by: userId,
  });
  if (error) return { success: false, error: missingOr(error) };
  revalidateFinance();
  return { success: true, data: { id: parsed.data } };
}

async function insertContractReceivables(
  orgId: string,
  input: {
    contratoId: string;
    clienteId: string;
    programa: Programa;
    valor: number;
    moeda: FinanceMoeda;
    dataInicio: string;
    dataFim: string | null;
    recorrencia: FinanceRecorrencia;
  },
): Promise<number> {
  const supabase = await createAdminClient();
  const horizon =
    input.dataFim ??
    contractEndFromMonths(
      input.dataInicio,
      defaultMonthsForPrograma(input.programa),
    );
  const dates = contractCompetenceDates({
    start: input.dataInicio,
    end: input.dataFim,
    monthly: input.recorrencia === "mensal",
    horizon,
  });
  const [
    { data: cliente },
    { data: category },
    { data: account },
    { data: existing },
  ] = await Promise.all([
    supabase
      .from("clientes")
      .select("org_id")
      .eq("id", input.clienteId)
      .maybeSingle(),
    supabase
      .from("finance_categories")
      .select("id")
      .eq("org_id", orgId)
      .eq("slug", PROGRAMA_CATEGORY_SLUG[input.programa] ?? "receita-outros")
      .maybeSingle(),
    supabase
      .from("finance_accounts")
      .select("id")
      .eq("org_id", orgId)
      .eq("archived", false)
      .order("kind")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("finance_entries")
      .select("competence_date")
      .eq("related_contrato_id", input.contratoId)
      .eq("source", "contrato"),
  ]);
  const already = new Set(
    (existing ?? []).map((row: { competence_date: string }) =>
      String(row.competence_date).slice(0, 10),
    ),
  );
  const missing = dates.filter((date) => !already.has(date));
  if (missing.length === 0) return 0;
  const origin: FinanceEntryOrigin =
    input.recorrencia === "mensal" ? "fee_mensal" : "projeto";
  const label = input.programa.toUpperCase();
  const rows = missing.map((date) => ({
    org_id: orgId,
    account_id: account?.id ?? null,
    category_id: category?.id ?? null,
    kind: "entrada" as const,
    status: "previsto" as const,
    amount: input.valor,
    currency: input.moeda,
    competence_date: date,
    due_date: date,
    description:
      input.recorrencia === "mensal"
        ? `Fee ${label} · ${date.slice(0, 7)}`
        : `Contrato ${label}`,
    source: "contrato" as const,
    origin,
    related_org_id: (cliente?.org_id as string | undefined) ?? null,
    related_contrato_id: input.contratoId,
  }));
  const { error } = await supabase.from("finance_entries").insert(rows);
  if (error) {
    if (
      !isMissingRelation(error) &&
      !error.message.includes("idx_finance_entries_contrato")
    ) {
      console.warn("[financeiro] contrato→a receber:", error.message);
    }
    return 0;
  }
  return rows.length;
}

export type FinanceCsvPreview = {
  reviews: FinanceImportReview[];
  counts: { new: number; duplicate: number; invalid: number };
};

async function gateFinanceOrMetricas(): Promise<Result<ServerSupabase>> {
  const supabase = await createClient();
  try {
    await requireAnyCapability(supabase, ["financeiro", "metricas"]);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Acesso negado",
    };
  }
  return { success: true, data: supabase };
}

/** Prévia do CSV: marca novos, duplicados e inválidos sem gravar. */
export async function previewFinanceCsvImport(
  csvText: string,
): Promise<Result<FinanceCsvPreview>> {
  const gated = await gateFinanceOrMetricas();
  if (!gated.success) return gated;
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;

  const { data, error } = await gated.data
    .from("finance_entries")
    .select("competence_date, kind, amount, description")
    .eq("org_id", org.data)
    .neq("status", "cancelado");
  if (error) {
    return { success: false, error: missingOr(error) };
  }

  const fingerprints = new Set(
    (
      (data ?? []) as {
        competence_date: string;
        kind: string;
        amount: number | string;
        description: string;
      }[]
    ).map((row) =>
      financeEntryFingerprint({
        competenceDate: row.competence_date,
        kind: row.kind,
        amount: toNumber(row.amount),
        description: row.description ?? "",
      }),
    ),
  );

  const reviews = reviewFinanceCsv(csvText, fingerprints);
  const counts = {
    new: reviews.filter((r) => r.verdict === "new").length,
    duplicate: reviews.filter((r) => r.verdict === "duplicate").length,
    invalid: reviews.filter((r) => r.verdict === "invalid").length,
  };
  return { success: true, data: { reviews, counts } };
}

const confirmImportSchema = z.object({
  rows: z
    .array(
      z.object({
        competenceDate: z.string().min(8),
        kind: z.enum(["entrada", "saida"]),
        amount: z.number().finite().min(0),
        description: z.string().trim().min(1),
        status: z.enum(["previsto", "realizado", "cancelado"]),
        origin: z.enum([
          "fee_mensal",
          "projeto",
          "edital",
          "outros",
          "despesa",
        ]),
        line: z.number().int().positive(),
      }),
    )
    .min(1, "Nenhuma linha nova para importar"),
});

/**
 * Grava só as linhas novas (já filtradas no cliente). Revalida fingerprint
 * no servidor para não duplicar se outro upload rodou no meio.
 */
export async function confirmFinanceCsvImport(
  raw: unknown,
): Promise<Result<{ inserted: number; skipped: number }>> {
  const gated = await gateFinanceOrMetricas();
  if (!gated.success) return gated;
  const parsed = confirmImportSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const org = await internalOrgId(gated.data);
  if (!org.success) return org;
  const userId = await currentUserId(gated.data);

  const { data: existing, error: existingError } = await gated.data
    .from("finance_entries")
    .select("competence_date, kind, amount, description")
    .eq("org_id", org.data)
    .neq("status", "cancelado");
  if (existingError) {
    return { success: false, error: missingOr(existingError) };
  }

  const fingerprints = new Set(
    (
      (existing ?? []) as {
        competence_date: string;
        kind: string;
        amount: number | string;
        description: string;
      }[]
    ).map((row) =>
      financeEntryFingerprint({
        competenceDate: row.competence_date,
        kind: row.kind,
        amount: toNumber(row.amount),
        description: row.description ?? "",
      }),
    ),
  );

  const toInsert: FinanceImportRow[] = [];
  let skipped = 0;
  for (const row of parsed.data.rows) {
    const fp = financeEntryFingerprint(row);
    if (fingerprints.has(fp)) {
      skipped += 1;
      continue;
    }
    fingerprints.add(fp);
    toInsert.push(row);
  }

  if (toInsert.length === 0) {
    return { success: true, data: { inserted: 0, skipped } };
  }

  const payload = toInsert.map((row) => ({
    org_id: org.data,
    kind: row.kind,
    origin: row.origin,
    status: row.status,
    amount: row.amount,
    tax_rate: 0,
    tax_amount: 0,
    competence_date: row.competenceDate,
    due_date: row.competenceDate,
    paid_at: row.status === "realizado" ? row.competenceDate : null,
    description: row.description,
    source: "manual" as const,
    notes: `Importado CSV (linha ${row.line})`,
    created_by: userId,
  }));

  const { error } = await gated.data.from("finance_entries").insert(payload);
  if (error) {
    return { success: false, error: missingOr(error) };
  }
  revalidateFinance();
  return { success: true, data: { inserted: toInsert.length, skipped } };
}
