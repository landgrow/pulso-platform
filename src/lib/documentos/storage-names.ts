/**
 * Nomes de arquivo/pasta do drive de Documentos ↔ chaves do Supabase Storage.
 *
 * O Storage só aceita um subconjunto ASCII na chave (acento, "ç", "%", "~"
 * são recusados), mas o cliente sobe "Balanço março.xlsx". Cada caractere fora
 * do conjunto seguro vira `=<hex>;` — reversível e sem ambiguidade, porque o
 * próprio "=" também é codificado.
 */
const SAFE_CHAR = /[A-Za-z0-9 _.\-()!,'+&@]/;
const ENCODED = /=([0-9a-f]{1,6});/g;

/** Arquivo que mantém de pé uma pasta vazia (o Storage não tem pasta de verdade). */
export const FOLDER_PLACEHOLDER = ".keep";

export const MAX_NAME_LENGTH = 120;

export function encodeName(name: string): string {
  let out = "";
  for (const ch of name) {
    out += SAFE_CHAR.test(ch)
      ? ch
      : `=${(ch.codePointAt(0) ?? 0).toString(16)};`;
  }
  return out;
}

export function decodeName(key: string): string {
  return key.replace(ENCODED, (_, hex: string) =>
    String.fromCodePoint(parseInt(hex, 16)),
  );
}

/** Erro legível se o nome não serve como arquivo/pasta; null se está ok. */
export function invalidNameReason(raw: string): string | null {
  const name = raw.trim();
  if (!name) return "Dê um nome.";
  if (name.length > MAX_NAME_LENGTH) {
    return `Nome muito longo (máximo ${MAX_NAME_LENGTH} caracteres).`;
  }
  if (/[\\/]/.test(name)) return "O nome não pode ter / nem \\.";
  if (name.startsWith(".")) return "O nome não pode começar com ponto.";
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    return "O nome tem caracteres inválidos.";
  }
  return null;
}

/** Pasta relativa ("Financeiro/2026") → segmentos validados, ou null se inválida. */
export function parseFolder(folder: string): string[] | null {
  if (folder === "") return [];
  const parts = folder.split("/");
  return parts.every((p) => invalidNameReason(p) === null && p === p.trim())
    ? parts
    : null;
}

/** "relatorio.pdf" já existe → "relatorio (2).pdf", "relatorio (3).pdf"… */
export function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let i = 2; ; i++) {
    const candidate = `${base} (${i})${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
}
