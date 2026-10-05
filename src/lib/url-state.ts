/** Alterações em parâmetros da URL: `null` ou "" remove o parâmetro. */
export type QueryPatch = Record<string, string | null>;

/**
 * Aplica `patch` sobre uma query string ("?a=1&b=2" ou "a=1&b=2") e devolve a
 * nova, sem o "?". Parâmetros que não estão no patch ficam como estavam.
 */
export function applyQueryPatch(search: string, patch: QueryPatch): string {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  }
  return params.toString();
}
