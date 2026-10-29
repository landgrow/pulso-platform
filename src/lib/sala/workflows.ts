export type WorkflowTrigger =
  | { type: "weekly"; weekday: number; hour: number }
  | { type: "daily"; hour: number }
  | { type: "meeting_soon" }
  | { type: "card_due" };

export type WorkflowAction = {
  type: "post_sala";
  channelSlug: string;
  body: string;
  useAi?: boolean;
  aiPrompt?: string;
};

export interface ParsedWorkflow {
  name: string;
  trigger: WorkflowTrigger;
  action: WorkflowAction;
}

const WEEKDAY_NAME: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  "segunda-feira": 1,
  terca: 2,
  terça: 2,
  "terca-feira": 2,
  "terça-feira": 2,
  quarta: 3,
  "quarta-feira": 3,
  quinta: 4,
  "quinta-feira": 4,
  sexta: 5,
  "sexta-feira": 5,
  sabado: 6,
  sábado: 6,
};

const WEEKDAY_LABEL = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractHour(text: string): number | null {
  const match =
    /(\d{1,2})\s*h(?:oras)?(?:\s*(\d{2}))?/.exec(text) ??
    /as\s+(\d{1,2})(?::(\d{2}))?/.exec(text);
  if (!match) return null;
  const hour = Number.parseInt(match[1] ?? "", 10);
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return null;
  return hour;
}

function extractWeekday(text: string): number | null {
  const normalized = normalize(text);
  for (const [name, value] of Object.entries(WEEKDAY_NAME)) {
    if (normalized.includes(normalize(name))) return value;
  }
  return null;
}

function extractChannel(text: string): string {
  const hash = /#([a-z0-9-]{2,40})/i.exec(text);
  if (hash?.[1]) return hash[1].toLowerCase();
  return "geral";
}

/** Lê o pedido em português e monta gatilho + recado na Sala. */
export function parseWorkflowPrompt(raw: string): ParsedWorkflow | null {
  const text = raw.trim();
  if (text.length < 3) return null;
  const normalized = normalize(text);
  const hour = extractHour(normalized) ?? 9;
  const weekday = extractWeekday(text);
  const channelSlug = extractChannel(text);

  let trigger: WorkflowTrigger;
  if (normalized.includes("prazo") || normalized.includes("vence")) {
    trigger = { type: "card_due" };
  } else if (normalized.includes("reuniao") || normalized.includes("agenda")) {
    trigger = { type: "meeting_soon" };
  } else if (weekday !== null) {
    trigger = { type: "weekly", weekday, hour };
  } else if (
    normalized.includes("todo dia") ||
    normalized.includes("diariamente")
  ) {
    trigger = { type: "daily", hour };
  } else {
    trigger = { type: "weekly", weekday: 1, hour };
  }

  const name = text.length > 72 ? `${text.slice(0, 71).trim()}…` : text;
  const wantsAi =
    /\bia\b/.test(normalized) ||
    normalized.includes("pulso") ||
    normalized.includes("insight") ||
    normalized.includes("pipeline") ||
    normalized.includes("resumo do crm");
  const action: WorkflowAction = {
    type: "post_sala",
    channelSlug,
    body: text,
  };
  if (wantsAi) {
    action.useAi = true;
    action.aiPrompt = text;
  }
  return {
    name,
    trigger,
    action,
  };
}

export function describeTrigger(trigger: WorkflowTrigger): string {
  if (trigger.type === "weekly") {
    const day = WEEKDAY_LABEL[trigger.weekday] ?? "dia";
    return `Toda ${day} às ${trigger.hour}h`;
  }
  if (trigger.type === "daily") return `Todo dia às ${trigger.hour}h`;
  if (trigger.type === "meeting_soon")
    return "Quando houver reunião hoje ou amanhã";
  return "Quando um prazo vence amanhã";
}

export function describeAction(action: WorkflowAction): string {
  if (action.useAi) {
    return `Gerar resposta com o PULSO e publicar em #${action.channelSlug}`;
  }
  return `Publicar em #${action.channelSlug}`;
}

export const WORKFLOW_WHEN_OPTIONS: {
  id: string;
  label: string;
  trigger: WorkflowTrigger;
}[] = [
  {
    id: "weekly-1",
    label: "Toda segunda de manhã",
    trigger: { type: "weekly", weekday: 1, hour: 8 },
  },
  {
    id: "weekly-2",
    label: "Toda terça de manhã",
    trigger: { type: "weekly", weekday: 2, hour: 8 },
  },
  {
    id: "weekly-3",
    label: "Toda quarta de manhã",
    trigger: { type: "weekly", weekday: 3, hour: 8 },
  },
  {
    id: "weekly-4",
    label: "Toda quinta de manhã",
    trigger: { type: "weekly", weekday: 4, hour: 8 },
  },
  {
    id: "weekly-5",
    label: "Toda sexta de manhã",
    trigger: { type: "weekly", weekday: 5, hour: 8 },
  },
  {
    id: "daily",
    label: "Todo dia de manhã",
    trigger: { type: "daily", hour: 8 },
  },
  {
    id: "card_due",
    label: "Quando um prazo vence amanhã",
    trigger: { type: "card_due" },
  },
  {
    id: "meeting_soon",
    label: "Quando houver reunião hoje ou amanhã",
    trigger: { type: "meeting_soon" },
  },
];

export function triggerOptionId(trigger: WorkflowTrigger): string {
  if (trigger.type === "weekly") return `weekly-${trigger.weekday}`;
  return trigger.type;
}

export function triggerFromOptionId(id: string): WorkflowTrigger {
  const found = WORKFLOW_WHEN_OPTIONS.find((option) => option.id === id);
  return found?.trigger ?? { type: "weekly", weekday: 1, hour: 8 };
}

export const WORKFLOW_CHIPS: { id: string; label: string; prompt: string }[] = [
  {
    id: "lembretes",
    label: "Lembretes",
    prompt:
      "Lembre a equipe toda segunda às 9h de postar o andamento em #geral",
  },
  {
    id: "agenda",
    label: "Agenda",
    prompt: "Avise no #geral a reunião de hoje e amanhã",
  },
  {
    id: "prazos",
    label: "Prazos",
    prompt: "Avise no #geral quando um prazo vencer amanhã",
  },
  {
    id: "crm",
    label: "CRM",
    prompt:
      "Toda segunda às 9h gere com IA um resumo do CRM e publique em #geral",
  },
];

export function isWorkflowDue(
  trigger: WorkflowTrigger,
  now: { weekday: number; hour: number },
): boolean {
  // O cron da Vercel no plano atual roda 1x/dia às 8h de Brasília (11:00 UTC).
  const digest = now.hour === 8;
  if (trigger.type === "weekly") {
    return trigger.weekday === now.weekday && digest;
  }
  if (trigger.type === "daily") return digest;
  if (trigger.type === "meeting_soon") return digest;
  if (trigger.type === "card_due") return digest;
  return false;
}
