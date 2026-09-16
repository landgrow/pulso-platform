export type WorksmartStatus = "rascunho" | "ativo" | "concluido";

export const WORKSMART_STATUS_LABELS: Record<WorksmartStatus, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  concluido: "Concluído",
};

export interface WorksmartAction {
  id: string;
  keyResultId: string;
  oQue: string;
  quemId: string | null;
  quemNome: string | null;
  quando: string | null;
  onde: string | null;
  porQue: string | null;
  como: string | null;
  quanto: string | null;
  cardId: string | null;
  boardId: string | null;
  columnLabel: string | null;
  done: boolean;
}

export interface WorksmartKeyResult {
  id: string;
  objectiveId: string;
  title: string;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  position: number;
  actions: WorksmartAction[];
}

export interface WorksmartObjective {
  id: string;
  orgId: string;
  title: string;
  setor: string | null;
  smartEspecifica: string | null;
  smartMensuravel: string | null;
  smartAtingivel: string | null;
  smartRelevante: string | null;
  smartTemporal: string | null;
  status: WorksmartStatus;
  createdAt: string;
  keyResults: WorksmartKeyResult[];
}
