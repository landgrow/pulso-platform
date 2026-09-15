/**
 * Destino do convite / recuperação de senha.
 * Tokens de invite do GoTrue vêm como `code` (PKCE), `token_hash`+`type`
 * (OTP) ou fragmento `#access_token` (implícito) — o servidor nunca vê o hash.
 */

const PASSWORD_SETUP_TYPES = new Set(["invite", "recovery", "signup", "email"]);

export function resolveAppUrl(appUrl: string | undefined): string {
  const explicit = (appUrl ?? "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return "";
}

export function inviteRedirectTo(appUrl: string | undefined): string {
  return `${resolveAppUrl(appUrl)}/auth/callback?next=/reset-password`;
}

export function safeCallbackNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

export function isPasswordSetupType(type: string | null): boolean {
  return type !== null && PASSWORD_SETUP_TYPES.has(type);
}

export function resolveAuthCallbackNext(
  type: string | null,
  next: string | null,
): string {
  if (isPasswordSetupType(type)) {
    return "/reset-password";
  }
  return safeCallbackNext(next);
}

export function hasAuthHash(hash: string): boolean {
  return /access_token=|refresh_token=|type=invite|type=recovery|type=signup/.test(
    hash,
  );
}

/**
 * Callback sem `code`/`token_hash`: ou o Google devolveu `?error=`, ou o
 * convite veio no fragmento `#access_token` (o servidor não vê o hash).
 */
export function emptyCallbackKind(
  oauthError: string | null,
): "oauth_error" | "consume_hash" {
  return oauthError ? "oauth_error" : "consume_hash";
}
