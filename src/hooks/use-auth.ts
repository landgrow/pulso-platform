"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook que gerencia o estado de autenticação em tempo real.
 *
 * Escuta `onAuthStateChange` do Supabase para manter `user` e `session`
 * sincronizados com mudanças externas (login em outra aba, expiração, etc.).
 * O cookie de sessão é atualizado automaticamente pelo Supabase Client.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const supabase = createClient();

    // Estado inicial — vem do cookie existente.
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setState({
        user: data.session?.user ?? null,
        session: data.session,
        isLoading: false,
        isAuthenticated: !!data.session,
      });
    })();

    // Escuta mudanças de auth em tempo real (login, logout, refresh token).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setState({
          user: session?.user ?? null,
          session,
          isLoading: false,
          isAuthenticated: !!session,
        });
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
