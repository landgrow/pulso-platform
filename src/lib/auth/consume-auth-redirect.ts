"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  parseAuthCallbackParams,
  type AuthCallbackParams,
} from "@/lib/auth/invite-callback";

const OTP_TYPES = new Set<string>([
  "invite",
  "recovery",
  "signup",
  "email",
  "magiclink",
  "email_change",
]);

function stripAuthParamsFromUrl(): void {
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.delete("code");
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");
  window.history.replaceState(null, "", url.pathname + url.search);
}

function isOtpType(type: string | null): type is EmailOtpType {
  return type !== null && OTP_TYPES.has(type);
}

/**
 * Grava a sessão do convite/recuperação no browser (hash implícito, PKCE
 * `code` ou OTP `token_hash`). Sem isso, `updateUser({ password })` no
 * servidor responde "Auth session missing!".
 */
export async function consumeAuthRedirect(
  params?: AuthCallbackParams,
): Promise<{ ok: boolean; type: string | null }> {
  const parsed =
    params ??
    parseAuthCallbackParams(window.location.search, window.location.hash);
  const supabase = createClient();

  if (parsed.accessToken && parsed.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: parsed.accessToken,
      refresh_token: parsed.refreshToken,
    });
    if (error) return { ok: false, type: parsed.type };
    stripAuthParamsFromUrl();
    return { ok: true, type: parsed.type };
  }

  if (parsed.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(parsed.code);
    if (error) return { ok: false, type: parsed.type };
    stripAuthParamsFromUrl();
    return { ok: true, type: parsed.type };
  }

  if (parsed.tokenHash && isOtpType(parsed.type)) {
    const { error } = await supabase.auth.verifyOtp({
      type: parsed.type,
      token_hash: parsed.tokenHash,
    });
    if (error) return { ok: false, type: parsed.type };
    stripAuthParamsFromUrl();
    return { ok: true, type: parsed.type };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { ok: Boolean(session), type: parsed.type };
}
