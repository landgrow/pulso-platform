import { isClosedColumnLabel } from "@/lib/boards/plano-de-acao-template";
import type { WorksmartStatus } from "@/types/worksmart";

export type SmartFields = {
  especifica: string | null;
  mensuravel: string | null;
  atingivel: string | null;
  relevante: string | null;
  temporal: string | null;
};

export type FiveH2W = {
  oQue: string;
  quem: string | null;
  quando: string | null;
  onde: string | null;
  porQue: string | null;
  como: string | null;
  quanto: string | null;
};

function filled(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

export function filledSmartCount(fields: SmartFields): number {
  return [
    fields.especifica,
    fields.mensuravel,
    fields.atingivel,
    fields.relevante,
    fields.temporal,
  ].filter(filled).length;
}

export function isSmartComplete(fields: SmartFields): boolean {
  return filledSmartCount(fields) === 5;
}

export function derivedObjectiveStatus(
  fields: SmartFields,
  current: WorksmartStatus,
): WorksmartStatus {
  if (current === "concluido") return "concluido";
  return isSmartComplete(fields) ? "ativo" : "rascunho";
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function krProgressPercent(input: {
  current: number | null;
  target: number | null;
  doneCards: number;
  totalCards: number;
}): number {
  if (input.target != null && input.target > 0 && input.current != null) {
    return Math.min(100, Math.max(0, (input.current / input.target) * 100));
  }
  if (input.totalCards > 0) {
    return Math.min(
      100,
      Math.max(0, (input.doneCards / input.totalCards) * 100),
    );
  }
  return 0;
}

export function krProgressLabel(input: {
  current: number | null;
  target: number | null;
  unit: string | null;
  doneCards: number;
  totalCards: number;
}): string {
  if (input.target != null && input.target > 0 && input.current != null) {
    const unit = input.unit?.trim() ? ` ${input.unit.trim()}` : "";
    return `${input.current} / ${input.target}${unit}`;
  }
  return `${input.doneCards} / ${input.totalCards}`;
}

export function format5h2wNotes(fields: FiveH2W): string {
  const rows: [string, string | null][] = [
    ["O quê", fields.oQue],
    ["Quem", fields.quem],
    ["Quando", fields.quando],
    ["Onde", fields.onde],
    ["Por quê", fields.porQue],
    ["Como", fields.como],
    ["Quanto", fields.quanto],
  ];
  return rows
    .filter(([, value]) => filled(value))
    .map(([label, value]) => `${label}: ${value?.trim()}`)
    .join("\n");
}

export function fiveH2WSummary(fields: FiveH2W): string {
  const parts: string[] = [];
  if (filled(fields.quem)) parts.push(`Quem ${fields.quem?.trim()}`);
  if (filled(fields.quando)) parts.push(`Quando ${fields.quando?.trim()}`);
  if (filled(fields.onde)) parts.push(`Onde ${fields.onde?.trim()}`);
  if (filled(fields.como)) parts.push(`Como ${fields.como?.trim()}`);
  if (filled(fields.quanto)) parts.push(`Quanto ${fields.quanto?.trim()}`);
  if (filled(fields.porQue)) parts.push(`Por quê ${fields.porQue?.trim()}`);
  return parts.join(" · ");
}

export function parseIsoDateUtc(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function daysUntil(temporalIso: string, todayIso: string): number {
  const diff = parseIsoDateUtc(temporalIso) - parseIsoDateUtc(todayIso);
  return Math.round(diff / 86_400_000);
}

export function horizonChip(
  temporal: string | null,
  todayIso: string,
): string | null {
  if (!temporal) return null;
  const days = daysUntil(temporal, todayIso);
  if (days < 0) return `atrasado ${Math.abs(days)}d`;
  if (days === 0) return "hoje";
  return `${days} dias`;
}

export function actionIsDone(columnLabel: string | null): boolean {
  return columnLabel != null && isClosedColumnLabel(columnLabel);
}
