/**
 * Cliente Supabase com service_role (bypassa RLS).
 *
 * ⚠️  ATENÇÃO: este cliente tem privilégios de admin do banco.
 *    NUNCA importe ou use em Client Components.
 *    Usar APENAS em Server Actions que precisam de acesso total ao DB
 *    (ex: onboarding, migrations, rollback).
 *
 * IMPORTANTE: usa `@supabase/supabase-js` puro, SEM adaptador de cookies.
 * A versão anterior usava `@supabase/ssr`'s createServerClient com cookies() —
 * isso faz o cliente hidratar a sessão do usuário logado a partir do cookie
 * da requisição e passar a autenticar como ESSE usuário (role authenticated),
 * não como service_role, silenciosamente sujeito a RLS de novo. Sem cookies
 * nenhum, não tem sessão pra hidratar — sempre autentica com a service_role
 * key pura.
 */

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let _adminClient: SupabaseClient | null = null;

/**
 * Cria cliente com service_role key. Instância singleton do processo — é
 * seguro reusar entre requisições porque não carrega estado de sessão nenhum.
 */
export async function createAdminClient(): Promise<SupabaseClient> {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY é obrigatória para o admin client",
    );
  }

  _adminClient = createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}
