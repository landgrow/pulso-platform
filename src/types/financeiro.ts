export type FinanceAccountKind = "caixa" | "banco" | "cartao";
export type FinanceCategoryKind = "receita" | "despesa" | "imposto" | "deducao";
export type FinanceEntryKind = "entrada" | "saida";
export type FinanceEntryOrigin =
  "fee_mensal" | "projeto" | "edital" | "outros" | "despesa";
export type FinanceEntryStatus = "previsto" | "realizado" | "cancelado";
export type FinanceEntrySource =
  "manual" | "contrato" | "nota" | "imposto" | "deducao";
export type FinanceInvoiceKind = "nfe" | "nfse" | "nfce" | "recibo";
export type FinanceInvoiceStatus = "rascunho" | "emitida" | "cancelada";
export type FinanceTaxKind =
  "das" | "iss" | "irpj" | "csll" | "pis" | "cofins" | "inss" | "outros";
export type FinanceTaxStatus = "previsto" | "pago" | "atrasado";
export type FinanceDeductionKind =
  "despesa_dedutivel" | "credito" | "isencao" | "outros";
export type FinanceMoeda = "BRL" | "USD" | "EUR";

export const ACCOUNT_KIND_LABELS: Record<FinanceAccountKind, string> = {
  caixa: "Caixa",
  banco: "Banco",
  cartao: "Cartão",
};

export const CATEGORY_KIND_LABELS: Record<FinanceCategoryKind, string> = {
  receita: "Receita",
  despesa: "Despesa",
  imposto: "Imposto",
  deducao: "Dedução",
};

export const ENTRY_KIND_LABELS: Record<FinanceEntryKind, string> = {
  entrada: "Entrada",
  saida: "Saída",
};

export const ENTRY_ORIGIN_LABELS: Record<FinanceEntryOrigin, string> = {
  fee_mensal: "Fee mensal",
  projeto: "Projeto",
  edital: "Edital",
  outros: "Outros",
  despesa: "Despesa",
};

export const INCOME_ORIGINS: FinanceEntryOrigin[] = [
  "fee_mensal",
  "projeto",
  "edital",
  "outros",
];

export const ENTRY_STATUS_LABELS: Record<FinanceEntryStatus, string> = {
  previsto: "Previsto",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export const INVOICE_KIND_LABELS: Record<FinanceInvoiceKind, string> = {
  nfe: "NF-e",
  nfse: "NFS-e",
  nfce: "NFC-e",
  recibo: "Recibo",
};

export const INVOICE_STATUS_LABELS: Record<FinanceInvoiceStatus, string> = {
  rascunho: "Rascunho",
  emitida: "Emitida",
  cancelada: "Cancelada",
};

export const TAX_KIND_LABELS: Record<FinanceTaxKind, string> = {
  das: "DAS",
  iss: "ISS",
  irpj: "IRPJ",
  csll: "CSLL",
  pis: "PIS",
  cofins: "COFINS",
  inss: "INSS",
  outros: "Outros",
};

export const TAX_STATUS_LABELS: Record<FinanceTaxStatus, string> = {
  previsto: "Previsto",
  pago: "Pago",
  atrasado: "Atrasado",
};

export const DEDUCTION_KIND_LABELS: Record<FinanceDeductionKind, string> = {
  despesa_dedutivel: "Despesa dedutível",
  credito: "Crédito tributário",
  isencao: "Isenção",
  outros: "Outros",
};

export const PROGRAMA_CATEGORY_SLUG: Record<string, string> = {
  bin: "receita-bin",
  scale: "receita-scale",
  conselho: "receita-conselho",
  foco: "receita-foco",
};

export interface FinanceAccount {
  id: string;
  orgId: string;
  name: string;
  kind: FinanceAccountKind;
  bankName: string | null;
  initialBalance: number;
  currency: FinanceMoeda;
  archived: boolean;
  balance: number;
}

export interface FinanceCategory {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  kind: FinanceCategoryKind;
  isSystem: boolean;
}

export interface FinanceEntry {
  id: string;
  orgId: string;
  accountId: string | null;
  categoryId: string | null;
  kind: FinanceEntryKind;
  status: FinanceEntryStatus;
  amount: number;
  currency: FinanceMoeda;
  competenceDate: string;
  dueDate: string | null;
  paidAt: string | null;
  description: string;
  notes: string | null;
  source: FinanceEntrySource;
  relatedOrgId: string | null;
  relatedContratoId: string | null;
  relatedInvoiceId: string | null;
  relatedTaxId: string | null;
  origin: FinanceEntryOrigin;
  taxRate: number;
  taxAmount: number;
  invoiceRef: string | null;
  accountName: string | null;
  categoryName: string | null;
  categoryKind: FinanceCategoryKind | null;
  relatedOrgName: string | null;
}

export interface MonthBalance {
  entradas: number;
  impostosNotas: number;
  saidas: number;
  liquido: number;
  balanco: number;
}

export interface FinanceInvoice {
  id: string;
  orgId: string;
  number: string;
  series: string | null;
  kind: FinanceInvoiceKind;
  status: FinanceInvoiceStatus;
  issueDate: string;
  amount: number;
  taxAmount: number;
  description: string | null;
  recipientOrgId: string | null;
  recipientName: string | null;
  entryId: string | null;
}

export interface FinanceTax {
  id: string;
  orgId: string;
  kind: FinanceTaxKind;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  rate: number;
  amount: number;
  status: FinanceTaxStatus;
  dueDate: string;
  paidAt: string | null;
  notes: string | null;
  entryId: string | null;
}

export interface FinanceDeduction {
  id: string;
  orgId: string;
  taxId: string | null;
  kind: FinanceDeductionKind;
  description: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
  entryId: string | null;
}

export interface FinanceDre {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  despesas: number;
  impostos: number;
  resultado: number;
}

export interface FinanceCashMonth {
  month: string;
  label: string;
  inflows: number;
  outflows: number;
  net: number;
}

export interface FinanceSummary {
  saldo: number;
  entradasMes: number;
  saidasMes: number;
  aReceber: number;
  aPagar: number;
  atrasadosReceber: number;
  atrasadosPagar: number;
  impostosMes: number;
  dre: FinanceDre;
  cashflow: FinanceCashMonth[];
}

export interface FinanceClientOption {
  orgId: string;
  name: string;
}

export interface FinanceWorkspace {
  orgId: string;
  month: string;
  today: string;
  summary: FinanceSummary;
  monthBalance: MonthBalance;
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  entries: FinanceEntry[];
  invoices: FinanceInvoice[];
  taxes: FinanceTax[];
  deductions: FinanceDeduction[];
  clients: FinanceClientOption[];
}
