import { createHmac } from "crypto";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function clientId(): string {
  return process.env.GOOGLE_DRIVE_CLIENT_ID ?? "";
}

function clientSecret(): string {
  return process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? "";
}

function signingSecret(): string {
  return (
    process.env.GOOGLE_DRIVE_CLIENT_SECRET ||
    process.env.CRON_SECRET ||
    "pulso-drive"
  );
}

export function driveOAuthConfigured(): boolean {
  return Boolean(clientId() && clientSecret());
}

export function driveRedirectUri(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return `${base}/api/integrations/google/callback`;
}

export function signOAuthState(userId: string): string {
  const exp = Date.now() + 15 * 60 * 1000;
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", signingSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function readOAuthState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [userId, expRaw, sig] = parts;
  if (!userId || !expRaw || !sig) return null;
  const payload = `${userId}.${expRaw}`;
  const expected = createHmac("sha256", signingSecret())
    .update(payload)
    .digest("hex");
  if (expected !== sig) return null;
  if (Number.parseInt(expRaw, 10) < Date.now()) return null;
  return userId;
}

export function googleAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: driveRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: signOAuthState(userId),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: driveRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    throw new Error(`Google OAuth: ${response.status}`);
  }
  return (await response.json()) as GoogleTokens;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new Error(`Google refresh: ${response.status}`);
  }
  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token)
    throw new Error("Google não devolveu access_token");
  return payload.access_token;
}

export async function googleAccountEmail(accessToken: string): Promise<string> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) throw new Error("Não li o e-mail da conta Google.");
  const payload = (await response.json()) as { email?: string };
  return payload.email ?? "";
}
