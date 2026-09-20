export const INTEGRATION_KINDS = [
  "email",
  "drive",
  "google_login",
  "whatsapp",
  "calendar",
  "notion",
  "webhook",
] as const;

export type IntegrationKind = (typeof INTEGRATION_KINDS)[number];

export const AUTOMATION_TRIGGERS = [
  "prazo",
  "comentario",
  "arquivo",
  "card_cliente",
  "cliente_atraso",
  "reuniao",
] as const;

export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

export const AUTOMATION_CHANNELS = ["email", "webhook"] as const;

export type AutomationChannel = (typeof AUTOMATION_CHANNELS)[number];

export interface IntegrationKindInfo {
  kind: IntegrationKind;
  name: string;
  detail: string;
  canCreate: boolean;
  needsEnv?: string;
}

export const INTEGRATION_CATALOG: IntegrationKindInfo[] = [
  {
    kind: "email",
    name: "E-mail",
    detail:
      "Avisos de prazo, comentário e arquivo. Pode começar sem domínio próprio.",
    canCreate: true,
  },
  {
    kind: "drive",
    name: "Google Drive",
    detail: "Pasta PULSO/cliente e anexos dos cards.",
    canCreate: true,
    needsEnv: "GOOGLE_DRIVE_CLIENT_ID",
  },
  {
    kind: "google_login",
    name: "Login Google",
    detail: "Entrar no PULSO com a conta Google, sem senha.",
    canCreate: false,
  },
  {
    kind: "whatsapp",
    name: "WhatsApp",
    detail:
      "Avisos no WhatsApp da consultora. Guarda o número agora; o envio entra depois.",
    canCreate: true,
  },
  {
    kind: "calendar",
    name: "Google Agenda",
    detail:
      "Reuniões do PULSO no calendário. Cria o conector agora; a sincronização entra depois.",
    canCreate: true,
  },
  {
    kind: "notion",
    name: "Notion",
    detail: "Espelho do Plano de Ação, só se ainda precisar.",
    canCreate: true,
  },
  {
    kind: "webhook",
    name: "Webhook",
    detail: "Quando um evento acontecer, o PULSO chama uma URL sua.",
    canCreate: true,
  },
];

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  prazo: "Prazo atrasado ou perto de vencer",
  comentario: "Comentário no card",
  arquivo: "Arquivo no card",
  card_cliente: "Cliente criou ou atualizou card",
  cliente_atraso: "Cliente atrasou a tarefa",
  reuniao: "Reunião hoje ou amanhã",
};

export const CHANNEL_LABELS: Record<AutomationChannel, string> = {
  email: "E-mail",
  webhook: "Webhook",
};

export function isIntegrationKind(value: string): value is IntegrationKind {
  return (INTEGRATION_KINDS as readonly string[]).includes(value);
}

export function isAutomationTrigger(value: string): value is AutomationTrigger {
  return (AUTOMATION_TRIGGERS as readonly string[]).includes(value);
}
