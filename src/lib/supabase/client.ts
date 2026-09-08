"use client";

import { createBrowserClient } from "@supabase/ssr";

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Cliente Supabase para browser (client-side)
 * Usar em componentes com 'use client'
 * Inicialização lazy - só cria o cliente quando realmente usado
 */
export function createClient(): ReturnType<typeof createBrowserClient> {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      // Em desenvolvimento, retorna cliente placeholder
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Supabase] Variáveis de ambiente não configuradas. Usando modo de desenvolvimento.",
        );
        return createBrowserClient(
          "https://placeholder.supabase.co",
          "placeholder-key",
        );
      }
      throw new Error(
        "@supabase/ssr: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios",
      );
    }

    supabaseClient = createBrowserClient(url, anonKey);
  }
  return supabaseClient;
}
