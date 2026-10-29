import { parseMoney } from "@/lib/financeiro/ledger";
import type {
  FinanceEntryKind,
  FinanceEntryOrigin,
  FinanceEntryStatus,
} from "@/types/financeiro";

export interface FinanceImportRow {
  competenceDate: string;
  kind: FinanceEntryKind;
  amount: number;
  description: string;
  status: FinanceEntryStatus;
  origin: FinanceEntryOrigin;
  line: number;
}

export type FinanceImportVerdict = "new" | "duplicate" | "invalid";

export interface FinanceImportReview {
  verdict: FinanceImportVerdict;
  row: FinanceImportRow | null;
  reason?: string;
  fingerprint: string;
  raw: string;
}

const KIND_ALIASES: Record<string, FinanceEntryKind> = {
  entrada: "entrada",
  receita: "entrada",
  credit: "entrada",
  credito: "entrada",
  in: "entrada",
  saida: "saida",
  saída: "saida",
  despesa: "saida",
  debit: "saida",
  debito: "saida",
  out: "saida",
};

const STATUS_ALIASES: Record<string, FinanceEntryStatus> = {
  previsto: "previsto",
  realizado: "realizado",
  pago: "realizado",
  cancelado: "cancelado",
};

const ORIGIN_ALIASES: Record<string, FinanceEntryOrigin> = {
  fee_mensal: "fee_mensal",
  fee: "fee_mensal",
  mensal: "fee_mensal",
  projeto: "projeto",
  edital: "edital",
  outros: "outros",
  despesa: "despesa",
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if ((ch === "," || ch === ";") && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function parseDate(raw: string): string | null {
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const br = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!br) return null;
  const day = br[1]!.padStart(2, "0");
  const month = br[2]!.padStart(2, "0");
  let year = br[3]!;
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month}-${day}`;
}

export function financeEntryFingerprint(input: {
  competenceDate: string;
  kind: string;
  amount: number;
  description: string;
}): string {
  const desc = input.description
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
  return [input.competenceDate, input.kind, input.amount.toFixed(2), desc].join(
    "|",
  );
}

/**
 * CSV esperado (cabeçalho flexível):
 * data, tipo, valor, descricao [, status, origem]
 */
export function reviewFinanceCsv(
  csvText: string,
  existingFingerprints: ReadonlySet<string>,
): FinanceImportReview[] {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const headerCells = splitCsvLine(lines[0]!).map(normalizeHeader);
  const hasHeader = headerCells.some((h) =>
    [
      "data",
      "date",
      "competence_date",
      "valor",
      "amount",
      "tipo",
      "kind",
    ].includes(h),
  );
  const header = hasHeader ? headerCells : [];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  function cell(
    cells: string[],
    names: string[],
    indexFallback: number,
  ): string {
    if (header.length > 0) {
      for (const name of names) {
        const idx = header.indexOf(name);
        if (idx >= 0) return cells[idx] ?? "";
      }
      return "";
    }
    return cells[indexFallback] ?? "";
  }

  return dataLines.map((raw, offset) => {
    const line = hasHeader ? offset + 2 : offset + 1;
    const cells = splitCsvLine(raw);
    const dateRaw = cell(
      cells,
      ["data", "date", "competence_date", "competencia"],
      0,
    );
    const kindRaw = cell(cells, ["tipo", "kind", "natureza"], 1);
    const amountRaw = cell(cells, ["valor", "amount", "value"], 2);
    const description = cell(
      cells,
      ["descricao", "description", "historico", "memo"],
      3,
    );
    const statusRaw = cell(cells, ["status", "situacao"], 4);
    const originRaw = cell(cells, ["origem", "origin"], 5);

    const competenceDate = parseDate(dateRaw);
    const kind = KIND_ALIASES[normalizeHeader(kindRaw)];
    const amount = parseMoney(amountRaw);
    const status = STATUS_ALIASES[normalizeHeader(statusRaw)] ?? "realizado";
    const origin =
      ORIGIN_ALIASES[normalizeHeader(originRaw)] ??
      (kind === "saida" ? "despesa" : "outros");

    if (!competenceDate || !kind || !Number.isFinite(amount) || amount < 0) {
      return {
        verdict: "invalid" as const,
        row: null,
        reason:
          "Linha inválida — use data, tipo (entrada/saída), valor e descrição.",
        fingerprint: "",
        raw,
      };
    }
    if (!description.trim()) {
      return {
        verdict: "invalid" as const,
        row: null,
        reason: "Descrição obrigatória.",
        fingerprint: "",
        raw,
      };
    }

    const row: FinanceImportRow = {
      competenceDate,
      kind,
      amount,
      description: description.trim(),
      status,
      origin,
      line,
    };
    const fingerprint = financeEntryFingerprint(row);
    if (existingFingerprints.has(fingerprint)) {
      return {
        verdict: "duplicate" as const,
        row,
        reason: "Já existe lançamento igual (data + tipo + valor + descrição).",
        fingerprint,
        raw,
      };
    }
    return {
      verdict: "new" as const,
      row,
      fingerprint,
      raw,
    };
  });
}
