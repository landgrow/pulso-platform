/**
 * Três acessos do PULSO:
 * - Cliente: só a própria organização.
 * - Admin: todas as funções.
 * - Consultor: funções marcadas em Equipe. O kanban "Tarefas administrativas"
 *   nunca entra nessa lista — é invisível para consultor, sempre.
 */

export const STAFF_CAPABILITIES = [
  { id: "painel", label: "Painel", group: "operacao" },
  { id: "atividades", label: "Atividades", group: "operacao" },
  { id: "mapa_mental", label: "Mapa Mental", group: "operacao" },
  { id: "crm", label: "CRM", group: "operacao" },
  { id: "clientes", label: "Organizações", group: "operacao" },
  { id: "bin", label: "BIN", group: "operacao" },
  { id: "min", label: "MIN", group: "operacao" },
  { id: "metricas", label: "Métricas / Financeiro", group: "financeiro" },
  { id: "acessos", label: "Acessos", group: "admin" },
  { id: "equipe", label: "Equipe", group: "admin" },
  { id: "audit_log", label: "Audit Log", group: "admin" },
] as const;

export type StaffCapabilityId = (typeof STAFF_CAPABILITIES)[number]["id"];

export const STAFF_CAPABILITY_IDS: StaffCapabilityId[] = STAFF_CAPABILITIES.map(
  (c) => c.id,
);

export const DEFAULT_CONSULTANT_CAPABILITIES: StaffCapabilityId[] =
  STAFF_CAPABILITIES.filter((c) => c.group === "operacao").map((c) => c.id);

export const ADMIN_ONLY_BOARD_KIND = "admin_only";
export const ADMIN_ONLY_BOARD_NAME = "Tarefas administrativas";

export function isStaffCapabilityId(value: string): value is StaffCapabilityId {
  return (STAFF_CAPABILITY_IDS as string[]).includes(value);
}

export function staffCan(
  role: "platform_admin" | "consultant" | null,
  capability: StaffCapabilityId,
  granted: readonly string[] = [],
): boolean {
  if (role === "platform_admin") return true;
  if (role !== "consultant") return false;
  return granted.includes(capability);
}
