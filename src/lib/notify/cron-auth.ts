/**
 * Vercel Cron manda Authorization: Bearer <CRON_SECRET>.
 * Sem secret o endpoint HTTP não dispara — o botão em Operação usa
 * a server action autenticada da equipe.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}
