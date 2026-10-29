/**
 * Helpers de servidor para ler a sessão do Supabase.
 *
 * Para Server Components, layouts e Route Handlers.
 * NÃO use em Client Components — use o hook `useAuth` em vez disso.
 */

import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import type { Session, User } from "@supabase/supabase-js";

/**
 * Lê a sessão atual do usuário (Server Component).
 *
 * Valida o JWT com getUser() antes de devolver o cookie da sessão.
 */
export async function getSession(): Promise<Session | null> {
  const user = await getRequestUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session || data.session.user.id !== user.id) return null;
  return data.session;
}

/**
 * Lê apenas o usuário da sessão atual, validado no Auth.
 */
export async function getCurrentUser(): Promise<User | null> {
  return getRequestUser();
}
