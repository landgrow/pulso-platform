export type RitualTipo = "standup" | "weekly" | "resultado";

export const RITUAL_LABELS: Record<RitualTipo, string> = {
  standup: "Daily Standup",
  weekly: "Weekly Review",
  resultado: "Sessão de Resultado",
};

export interface Ritual {
  id: string;
  org_id: string;
  tipo: RitualTipo;
  data: string;
  participantes: string[];
  notas: string | null;
  created_at: string;
}
