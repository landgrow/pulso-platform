/**
 * Utilitários para geração e validação de slugs.
 *
 * Slugs são usados em:
 * - organizations.slug (URL, identificador legível)
 * - coleções (futuro)
 */

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "bin",
  "dashboard",
  "login",
  "logout",
  "public",
  "register",
  "settings",
  "www",
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 50;

/**
 * Gera um slug legível a partir de um nome.
 *
 * - Converte para lowercase
 * - Remove acentos (NFD normalization)
 * - Substitui caracteres não-alfanuméricos por hífens
 * - Remove hífens duplicados e nas pontas
 * - Trunca em 50 caracteres
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove marcas de acento
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH);
}

/**
 * Adiciona um sufixo numérico se o slug já existir (ex: "minha-empresa-2").
 */
export function ensureUniqueSlug(
  base: string,
  existingSlugs: string[],
): string {
  const taken = new Set(existingSlugs);
  if (!taken.has(base)) return base;

  let i = 2;
  while (taken.has(`${base}-${i}`)) {
    i++;
  }
  return `${base}-${i}`;
}

/**
 * Valida se uma string é um slug válido.
 */
export function isValidSlug(slug: string): boolean {
  if (slug.length === 0 || slug.length > SLUG_MAX_LENGTH) return false;
  if (!SLUG_PATTERN.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return true;
}
