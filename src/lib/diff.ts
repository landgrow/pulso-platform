import { diffLines as jsDiffLines } from "diff";

export type FieldDiffStatus = "added" | "removed" | "changed";

export interface FieldDiff {
  key: string;
  status: FieldDiffStatus;
  before: unknown;
  after: unknown;
}

/**
 * Diff campo-a-campo entre dois payloads (usado para `formulario`, cujos
 * campos são majoritariamente escalares — número/string/enum).
 * Retorna só o que mudou, ordenado por chave; chaves idênticas são omitidas.
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): FieldDiff[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const result: FieldDiff[] = [];

  for (const key of keys) {
    const hasBefore = key in before;
    const hasAfter = key in after;

    if (!hasBefore && hasAfter) {
      result.push({
        key,
        status: "added",
        before: undefined,
        after: after[key],
      });
    } else if (hasBefore && !hasAfter) {
      result.push({
        key,
        status: "removed",
        before: before[key],
        after: undefined,
      });
    } else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      result.push({
        key,
        status: "changed",
        before: before[key],
        after: after[key],
      });
    }
  }

  return result.sort((a, b) => a.key.localeCompare(b.key));
}

/** Lista só as chaves alteradas (equivalente ao `change_summary` calculado no trigger SQL). */
export function changedKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  return diffFields(before, after).map((d) => d.key);
}

export interface LinePart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

/**
 * Diff linha-a-linha estilo `git diff` (usado para `texto_livre` e transcrições).
 */
export function diffText(before: string, after: string): LinePart[] {
  return jsDiffLines(before, after).map((part) => ({
    value: part.value,
    added: part.added,
    removed: part.removed,
  }));
}
