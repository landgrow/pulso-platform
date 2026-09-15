import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { resolveAuthCallbackNext } from "@/lib/auth/invite-callback";

/**
 * Callback unificado:
 * - OAuth Google: `?code=`
 * - Convite / reset (OTP): `?token_hash=&type=invite|recovery`
 * - Convite implícito: hash `#access_token` — o servidor não vê; redireciona
 *   para `/auth/confirm` (client) quando o destino é criar senha.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = resolveAuthCallbackNext(type, searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    const msg = error.message.toLowerCase();
    const friendlyError =
      msg.includes("signup") || msg.includes("not allowed")
        ? "Esse email do Google ainda não tem acesso liberado. Fale com sua consultora."
        : "Não foi possível entrar. Tente novamente ou peça um novo convite.";

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(friendlyError)}`,
    );
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Link de convite inválido ou expirado. Peça um novo acesso.")}`,
    );
  }

  // Sem code/token_hash: convite com tokens no hash, ou OAuth cancelado.
  if (next === "/reset-password") {
    const confirm = new URL("/auth/confirm", origin);
    confirm.searchParams.set("next", next);
    return NextResponse.redirect(confirm);
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Login com Google cancelado ou inválido.")}`,
  );
}
