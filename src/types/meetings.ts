export interface ChecklistItem {
  id: string;
  texto: string;
  done: boolean;
}

export interface MeetingGuest {
  email: string;
  nome: string;
}

export interface Meeting {
  id: string;
  org_id: string;
  titulo: string;
  data: string;
  participantes: string[];
  resumo: string | null;
  topicos: string | null;
  checklist: ChecklistItem[];
  created_at: string;
  /** "HH:MM:SS" em horário de São Paulo; null = reunião só com data. */
  hora_inicio?: string | null;
  duracao_min?: number | null;
  link?: string | null;
  convidados?: MeetingGuest[] | null;
  convite_enviado_at?: string | null;
  lembrete_enviado_at?: string | null;
  ics_sequence?: number | null;
}
