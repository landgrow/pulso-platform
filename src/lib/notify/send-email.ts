export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

export type SendEmailResult =
  { ok: true; id: string } | { ok: false; error: string; skipped?: boolean };

/**
 * Envio transacional via Resend. Sem chave, o job registra o pulo
 * (não finge que enviou).
 */
export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      skipped: true,
      error: "RESEND_API_KEY ausente — e-mail não enviado.",
    };
  }

  const { resolveNotifyFromEmail } =
    await import("@/lib/integrations/from-address");
  const from = await resolveNotifyFromEmail();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      error: payload.message ?? `Resend HTTP ${response.status}`,
    };
  }

  return { ok: true, id: payload.id ?? "sent" };
}
