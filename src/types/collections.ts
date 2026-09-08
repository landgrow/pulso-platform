/**
 * Tipos do Motor de Coleções (Épico 1).
 * Espelham o schema em `db/migrations/0005_collections_schema.sql`.
 */

import type { ClientRole } from "./organization";

// ─── Clientes ────────────────────────────────────────────────────────────────

export type ClientPorte = "micro" | "pequena" | "media" | "grande";

export interface Cliente {
  id: string;
  org_id: string;
  cnpj: string | null;
  setor: string | null;
  porte: ClientPorte | null;
  faturamento_faixa: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Períodos ────────────────────────────────────────────────────────────────

export type PeriodoStatus =
  "em_coleta" | "pronto_para_analise" | "analisado" | "fechado";

export interface PeriodoDados {
  id: string;
  cliente_id: string;
  mes: number;
  ano: number;
  status: PeriodoStatus;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Resumo de período com contagens de coleções e evidências. */
export interface PeriodSummary {
  id: string;
  mes: number;
  ano: number;
  status: PeriodoStatus;
  closed_at: string | null;
  created_at: string;
  colecoes_count: number;
  evidencias_count: number;
}

// ─── Coleções ────────────────────────────────────────────────────────────────

export type ColecaoTipo = "formulario" | "texto_livre" | "transcricao_audio";
export type ColecaoStatus = "rascunho" | "validado" | "descartado";

export interface Colecao {
  id: string;
  periodo_id: string;
  tipo: ColecaoTipo;
  status: ColecaoStatus;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Revisões de coleções (versionamento) ─────────────────────────────────────

export interface ColecaoRevision {
  id: string;
  colecao_id: string;
  rev_number: number;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  change_summary: string[];
  created_by: string | null;
  created_at: string;
}

/**
 * Uma entrada da timeline de histórico: ou uma revision arquivada, ou a
 * versão atual "virtual" (sintetizada a partir de `colecoes`, já que a
 * versão vigente só ganha uma linha em `colecao_revisions` na PRÓXIMA edição).
 */
export interface TimelineEntry {
  colecaoId: string;
  tipo: ColecaoTipo;
  revNumber: number;
  isCurrent: boolean;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  changeSummary: string[];
  createdBy: string | null;
  createdAt: string;
}

// ─── Evidências ──────────────────────────────────────────────────────────────

export type EvidenciaTipo = "pdf" | "excel" | "csv" | "audio" | "outro";
export type TranscricaoStatus =
  "pending" | "processing" | "completed" | "failed";

export interface Evidencia {
  id: string;
  periodo_id: string;
  tipo: EvidenciaTipo;
  storage_path: string;
  nome_original: string;
  mime_type: string;
  tamanho_bytes: number;
  hash: string;
  transcricao: string | null;
  transcricao_status: TranscricaoStatus | null;
  uploaded_by: string | null;
  created_at: string;
}

// ─── Período detalhado (com coleções e evidências) ───────────────────────────

export interface PeriodDetail {
  periodo: PeriodoDados;
  colecoes: Colecao[];
  evidencias: Evidencia[];
  canEdit: boolean;
  canDelete: boolean;
  role: ClientRole | "platform_admin" | "consultant" | null;
}

// ─── Result helpers (padrão usado nas server actions) ────────────────────────

export type ErrorCode =
  | "PERMISSION_DENIED"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "PERIOD_CLOSED"
  | "INTERNAL_ERROR";

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: ErrorCode };
