import type { SupabaseClient } from "@supabase/supabase-js";
import { inviteRedirectTo } from "@/lib/auth/invite-callback";

export type AccessEmailChannel = "invite" | "recovery";

export type AccessEmailResult =
  | { ok: true; userId: string; channel: AccessEmailChannel }
  | { ok: false; error: string };

function isAlreadyRegistered(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes("already been registered") ||
    msg.includes("already registered") ||
    msg.includes("already exists") ||
    msg.includes("user already")
  );
}

function isRateLimited(message: string): boolean {
  const msg = message.toLowerCase();
  return msg.includes("rate limit") || msg.includes("429");
}

/**
 * Sempre tenta mandar email: convite (conta nova) ou recuperação de senha
 * (conta que já existe). O PULSO não envia o email — o Auth do Supabase envia.
 */
export async function sendAccessEmail(
  admin: SupabaseClient,
  email: string,
  name: string,
): Promise<AccessEmailResult> {
  const redirectTo = inviteRedirectTo(process.env.NEXT_PUBLIC_APP_URL);

  const { data: created, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
      redirectTo,
    });

  if (!inviteError && created.user) {
    return { ok: true, userId: created.user.id, channel: "invite" };
  }

  const inviteMsg = inviteError?.message ?? "Erro ao enviar convite";
  if (isRateLimited(inviteMsg)) {
    return {
      ok: false,
      error:
        "Limite de emails do Supabase (uns 3–4 por hora no plano gratuito). Espere um pouco ou olhe o spam.",
    };
  }

  if (!isAlreadyRegistered(inviteMsg)) {
    return { ok: false, error: inviteMsg };
  }

  const { data: existingId, error: rpcError } = await admin.rpc(
    "find_user_id_by_email",
    { p_email: email },
  );
  if (rpcError || !existingId) {
    return {
      ok: false,
      error:
        "Este email já tem conta, mas não consegui localizar o usuário para reenviar o acesso.",
    };
  }

  const { error: recoverError } = await admin.auth.resetPasswordForEmail(
    email,
    { redirectTo },
  );
  if (recoverError) {
    if (isRateLimited(recoverError.message)) {
      return {
        ok: false,
        error:
          "Limite de emails do Supabase. Espere um pouco ou reenvie pelo painel Authentication → Users.",
      };
    }
    return { ok: false, error: recoverError.message };
  }

  return { ok: true, userId: existingId as string, channel: "recovery" };
}

export function accessEmailToast(
  channel: AccessEmailChannel,
  email: string,
): string {
  if (channel === "invite") {
    return `Convite enviado para ${email}. Peça para olhar a caixa de entrada e o spam (remetente Supabase).`;
  }
  return `Esta conta já existia. Enviei email para ${email} definir/redefinir a senha. Olhe também o spam.`;
}
