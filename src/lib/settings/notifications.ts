export interface NotificationPrefs {
  prazo: boolean;
  reuniao: boolean;
  conviteEquipe: boolean;
  resumoDiario: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  prazo: true,
  reuniao: true,
  conviteEquipe: true,
  resumoDiario: false,
};

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
  const data = raw as Record<string, unknown>;
  return {
    prazo:
      typeof data.prazo === "boolean"
        ? data.prazo
        : DEFAULT_NOTIFICATION_PREFS.prazo,
    reuniao:
      typeof data.reuniao === "boolean"
        ? data.reuniao
        : DEFAULT_NOTIFICATION_PREFS.reuniao,
    conviteEquipe:
      typeof data.conviteEquipe === "boolean"
        ? data.conviteEquipe
        : DEFAULT_NOTIFICATION_PREFS.conviteEquipe,
    resumoDiario:
      typeof data.resumoDiario === "boolean"
        ? data.resumoDiario
        : DEFAULT_NOTIFICATION_PREFS.resumoDiario,
  };
}
