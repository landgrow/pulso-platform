import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback do OAuth (Google, etc.). Troca o `code` da URL por uma sessão.
 *
 * Login social só funciona para emails que já têm conta criada via
 * /admin/acessos — não há autocadastro. Com "Allow new user signups"
 * desligado no Supabase, exchangeCodeForSession falha para emails novos
 * e cai no branch de erro abaixo.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

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
        : "Não foi possível entrar com o Google. Tente novamente.";

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(friendlyError)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Login com Google cancelado ou inválido.")}`,
  );
}
