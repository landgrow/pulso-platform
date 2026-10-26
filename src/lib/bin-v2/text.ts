export function normalizeBinText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function labelMatches(
  label: string,
  triggers: readonly string[],
): boolean {
  if (triggers.length === 0) return false;
  const needle = normalizeBinText(label);
  return triggers.some((trigger) => normalizeBinText(trigger) === needle);
}
