export type Programa = "bin" | "scale" | "conselho" | "foco";
export type ContratoStatus = "ativo" | "pausado" | "encerrado";
export type Moeda = "BRL" | "USD" | "EUR";

export const PROGRAMA_LABELS: Record<Programa, string> = {
  bin: "BIN — Diagnóstico dos 10 Setores",
  scale: "Land Grow Scale (6 meses)",
  conselho: "Conselho Consultivo",
  foco: "Intervenção Focada (FOCO)",
};

export type TeamRole = "client_owner" | "client_member" | "client_viewer";

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  client_owner: "Proprietário",
  client_member: "Membro",
  client_viewer: "Visualizador",
};

export interface Contrato {
  id: string;
  programa: Programa;
  valor: number;
  moeda: Moeda;
  data_inicio: string;
  data_fim: string | null;
  status: ContratoStatus;
}

export interface TeamMember {
  user_id: string;
  email: string;
  role: TeamRole;
}

export interface ClientDirectoryEntry {
  org_id: string;
  slug: string;
  name: string;
  plan: string;
  deleted_at: string | null;
  cliente_id: string | null;
  owner_user_id: string | null;
  owner_email: string | null;
  owner_name: string | null;
  member_emails: string[];
  members: TeamMember[];
  contratos: Contrato[];
}
