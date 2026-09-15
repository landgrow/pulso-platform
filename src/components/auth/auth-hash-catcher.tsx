"use client";

import { useEffect } from "react";
import { hasAuthHash } from "@/lib/auth/invite-callback";

/**
 * Convite/recuperação do Supabase às vezes abre `/` ou `/login` com
 * `#access_token` — o servidor não vê o hash. Esta captura vale em qualquer
 * página e manda para `/auth/confirm`, que grava a sessão e abre definir senha.
 */
export function AuthHashCatcher(): null {
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/auth/confirm") || path.startsWith("/auth/callback")) {
      return;
    }

    const search = window.location.search;
    const hash = window.location.hash;

    if (/[?&]token_hash=/.test(search)) {
      window.location.replace(`/auth/callback${search}${hash}`);
      return;
    }

    if (hasAuthHash(hash)) {
      window.location.replace(`/auth/confirm?next=/reset-password${hash}`);
    }
  }, []);

  return null;
}
