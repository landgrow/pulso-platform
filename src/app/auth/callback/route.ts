import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  emptyCallbackKind,
  HASH_FORWARD_HTML,
  resolveAuthCallbackNext,
} from "@/lib/auth/invite-callback";

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * Callback unificado:
 * - OAuth Google: `?code=`
 * - Convite / reset (OTP): `?token_hash=&type=invite|recovery`
 * - Convite implícito: hash `#access_token` — o servidor não vê; devolve HTML
 *   na mesma URL para o browser encaminhar o fragmento a `/auth/confirm`.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = resolveAuthCallbackNext(type, searchParams.get("next"));

  if (code || (tokenHash && type)) {
    const pending: CookieToSet[] = [];
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              pending.push({ name, value, options });
            });
          },
        },
      },
    );

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          type: type as EmailOtpType,
          token_hash: tokenHash as string,
        });

    if (!error) {
      const res = NextResponse.redirect(`${origin}${next}`);
      pending.forEach(({ name, value, options }) => {
        res.cookies.set({ name, value, ...options });
      });
      return res;
    }

    const msg = error.message.toLowerCase();
    const friendlyError =
      msg.includes("signup") || msg.includes("not allowed")
        ? "Esse email do Google ainda não tem acesso liberado. Fale com sua consultora."
        : "Link de convite inválido ou expirado. Peça um novo acesso.";

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(friendlyError)}`,
    );
  }

  if (emptyCallbackKind(searchParams.get("error")) === "oauth_error") {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Login com Google cancelado ou inválido.")}`,
    );
  }

  return new NextResponse(HASH_FORWARD_HTML, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
