export interface ChecklistItem {
  id: string;
  texto: string;
  done: boolean;
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
}
