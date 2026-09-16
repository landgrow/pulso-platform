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

export type AuthCallbackParams = {
  code: string | null;
  tokenHash: string | null;
  type: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

/** Lê `code` / `token_hash` da query e tokens do fragmento `#access_token`. */
export function parseAuthCallbackParams(
  search: string,
  hash: string,
): AuthCallbackParams {
  const query = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    code: query.get("code"),
    tokenHash: query.get("token_hash"),
    type: hashParams.get("type") ?? query.get("type"),
    accessToken: hashParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token"),
  };
}

/**
 * HTML no próprio `/auth/callback`: um 302 para `/auth/confirm` apaga o
 * `#access_token` (o servidor nunca vê o hash). Ficar na mesma URL preserva
 * o fragmento; o script só o encaminha.
 */
export const HASH_FORWARD_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>PULSO</title></head>
<body>
<script>
  location.replace("/auth/confirm?next=/reset-password" + location.hash);
</script>
<p>Validando seu convite...</p>
</body>
</html>`;
