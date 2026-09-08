/**
 * Helpers de servidor para ler a sessão do Supabase.
 *
 * Para Server Components, layouts e Route Handlers.
 * NÃO use em Client Components — use o hook `useAuth` em vez disso.
 */

import { createClient } from "@/lib/supabase/server";
import type { Session, User } from "@supabase/supabase-js";

/**
 * Lê a sessão atual do usuário (Server Component).
 *
 * Retorna `null` se não houver sessão. O middleware já garante que rotas
 * autenticadas não são acessíveis sem sessão, então em Server Components
 * dentro de `(dashboard)/` o retorno é sempre `Session`.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Lê apenas o usuário da sessão atual.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}
