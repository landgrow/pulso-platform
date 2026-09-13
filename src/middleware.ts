import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // `res` precisa ser reatribuível (let, não const) — o setAll abaixo troca a
  // resposta inteira por uma nova toda vez que o Supabase escreve cookies de
  // sessão (login, refresh de token). Um Object.assign(res.cookies, ...) em
  // cima de uma resposta fixa parece funcionar mas nunca propaga o
  // Set-Cookie de verdade pro navegador — a sessão nunca gruda.
  let res = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          res = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Atualiza/refresca a sessão — verifica JWT e renova refresh token se necessário.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Detecta sessão expirada para mostrar mensagem amigável.
  const isExpired =
    error?.message?.includes("refresh_token_not_found") ||
    error?.message?.includes("Invalid JWT");

  const pathname = request.nextUrl.pathname;

  // Rotas públicas — não precisam de autenticação.
  const publicRoutes = [
    "/",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
    "/preview",
  ];
  const isPublicRoute =
    publicRoutes.some((r) => pathname === r) || pathname.startsWith("/preview");

  // Escape hatch do auto-login: /login?manual=1 sempre mostra a tela de
  // login de verdade, mesmo com auto-login configurado — usado pra logar
  // como outra conta (ex: ver o sistema como um cliente).
  const isManualLogin =
    pathname === "/login" && request.nextUrl.searchParams.has("manual");

  // Sessão expirada — redireciona para login com parâmetro.
  if (!isPublicRoute && isExpired) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("expired", "1");
    return NextResponse.redirect(url);
  }

  // ─── Auto-login SÓ em desenvolvimento local ──────────────────────────────
  // NODE_ENV é decidido pelo próprio Next.js (dev vs. build/start), não é algo
  // configurável por engano — nunca é "development" num deploy real. Sem
  // sessão, evita a tela de login toda hora durante o trabalho de construção;
  // exige DEV_AUTO_LOGIN_EMAIL/PASSWORD no .env.local (nunca commitado).
  if (
    !isPublicRoute &&
    !isManualLogin &&
    !user &&
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTO_LOGIN_EMAIL &&
    process.env.DEV_AUTO_LOGIN_PASSWORD
  ) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: process.env.DEV_AUTO_LOGIN_EMAIL,
      password: process.env.DEV_AUTO_LOGIN_PASSWORD,
    });
    if (!signInError) {
      return res;
    }
  }

  // Não autenticado — redireciona para login.
  if (!isPublicRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Autenticado em rota pública — vai para dashboard. Exceto home e /preview:
  // o protótipo estático é só uma referência visual, não uma tela de auth —
  // não faz sentido expulsar quem está logado de lá pro dashboard.
  if (
    isPublicRoute &&
    user &&
    pathname !== "/" &&
    !pathname.startsWith("/preview") &&
    !isManualLogin
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/webhook).*)",
  ],
};
