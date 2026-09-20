export interface NotificationPrefs {
  prazo: boolean;
  reuniao: boolean;
  conviteEquipe: boolean;
  resumoDiario: boolean;
  comentario: boolean;
  arquivo: boolean;
  cardCliente: boolean;
  clienteAtraso: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  prazo: true,
  reuniao: true,
  conviteEquipe: true,
  resumoDiario: false,
  comentario: true,
  arquivo: true,
  cardCliente: true,
  clienteAtraso: true,
};

function bool(
  data: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  return typeof data[key] === "boolean" ? data[key] : fallback;
}

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
  const data = raw as Record<string, unknown>;
  return {
    prazo: bool(data, "prazo", DEFAULT_NOTIFICATION_PREFS.prazo),
    reuniao: bool(data, "reuniao", DEFAULT_NOTIFICATION_PREFS.reuniao),
    conviteEquipe: bool(
      data,
      "conviteEquipe",
      DEFAULT_NOTIFICATION_PREFS.conviteEquipe,
    ),
    resumoDiario: bool(
      data,
      "resumoDiario",
      DEFAULT_NOTIFICATION_PREFS.resumoDiario,
    ),
    comentario: bool(data, "comentario", DEFAULT_NOTIFICATION_PREFS.comentario),
    arquivo: bool(data, "arquivo", DEFAULT_NOTIFICATION_PREFS.arquivo),
    cardCliente: bool(
      data,
      "cardCliente",
      DEFAULT_NOTIFICATION_PREFS.cardCliente,
    ),
    clienteAtraso: bool(
      data,
      "clienteAtraso",
      DEFAULT_NOTIFICATION_PREFS.clienteAtraso,
    ),
  };
}
