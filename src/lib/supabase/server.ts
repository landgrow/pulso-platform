import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para server-side (App Router)
 * Usar em Server Components e Route Handlers
 */
export async function createClient(): Promise<
  ReturnType<typeof createServerClient>
> {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Supabase Server] Variáveis de ambiente não configuradas.");
      return createServerClient(
        "https://placeholder.supabase.co",
        "placeholder-key",
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options),
                );
              } catch {
                // ignore
              }
            },
          },
        },
      );
    }
    throw new Error(
      "@supabase/ssr: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Handle setAll error in Server Components
          // This can happen when calling createClient() outside of a request context
        }
      },
    },
  });
}

// Cliente com service_role: usar createAdminClient() de "@/lib/supabase/admin"
// — não duplicar aqui. Aquele usa @supabase/supabase-js puro, sem cookies, de
// propósito: um adaptador de cookies (como este arquivo usa acima) hidrata a
// sessão do usuário logado e faz o "admin client" autenticar como esse
// usuário em vez de service_role, ficando sujeito a RLS de novo.
