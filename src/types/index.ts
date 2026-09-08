/**
 * Tipos globais do PULSO
 */

/** Papéis disponíveis no sistema */
export type UserRole =
  | "platform_admin"
  | "consultant"
  | "client_owner"
  | "client_member"
  | "client_viewer";

/** Status de uma assessment do BIN */
export type BinAssessmentStatus =
  "draft" | "submitted" | "scored" | "published";

/** Tipos de propriedade do motor de coleções */
export type PropertyType =
  | "text"
  | "long_text"
  | "number"
  | "currency"
  | "percent"
  | "select"
  | "multi_select"
  | "status"
  | "date"
  | "datetime"
  | "checkbox"
  | "url"
  | "email"
  | "phone"
  | "person"
  | "relation"
  | "file"
  | "rating";

/** Tipos de view do motor de coleções */
export type ViewType = "table" | "board" | "list" | "gallery" | "calendar";

/** Tipo de bloco do MIN */
export type MinBlockPhase = 1 | 2 | 3;

/** 10 áreas canônicas (BIN e MIN) */
export type AreaCanonical =
  | "estrategico"
  | "financeiro"
  | "comercial"
  | "marketing"
  | "operacional"
  | "administrativo"
  | "pessoas"
  | "lideranca"
  | "juridico"
  | "inovacao";

/** Labels das áreas canônicas em pt-BR */
export const AREA_LABELS: Record<AreaCanonical, string> = {
  estrategico: "Estratégico",
  financeiro: "Financeiro",
  comercial: "Comercial/Vendas",
  marketing: "Marketing",
  operacional: "Operacional",
  administrativo: "Administrativo",
  pessoas: "Pessoas/RH",
  lideranca: "Liderança",
  juridico: "Jurídico",
  inovacao: "Inovação",
};

/** Severity de inconsistências */
export type InconsistencySeverity = "low" | "medium" | "high" | "critical";

/** Tipo de achado no BIN */
export type FindingKind = "forca" | "alerta" | "inconsistencia";

// Result<T> está definido em ./collections.ts com ErrorCode
// Re-exporta para uso global
export type { Result, ErrorCode } from "./collections";
