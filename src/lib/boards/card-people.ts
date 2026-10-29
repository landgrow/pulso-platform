export const CARD_ASSIGNEES_KEY = "_responsaveis";

export interface CardPerson {
  userId: string;
  name: string;
  kind?: "staff" | "member";
}

const HIDDEN_PROPERTY_LABELS = new Set([
  "teste de propriedade",
  "orçamento",
  "orcamento",
]);

export function isShownBoardProperty(property: {
  key: string;
  label: string;
  visible?: boolean;
}): boolean {
  if (property.visible === false) return false;
  if (property.key.startsWith("_")) return false;
  return !HIDDEN_PROPERTY_LABELS.has(property.label.trim().toLowerCase());
}

export function uniquePeople(people: CardPerson[]): CardPerson[] {
  const seen = new Set<string>();
  const result: CardPerson[] = [];
  for (const person of people) {
    if (!person.userId || seen.has(person.userId)) continue;
    seen.add(person.userId);
    result.push(person);
  }
  return result;
}

export function parseStoredAssignees(value: unknown): CardPerson[] {
  if (!Array.isArray(value)) return [];
  return uniquePeople(
    value.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const item = row as Record<string, unknown>;
      if (typeof item.userId !== "string" || typeof item.name !== "string") {
        return [];
      }
      const kind =
        item.kind === "staff" || item.kind === "member" ? item.kind : undefined;
      return [
        { userId: item.userId, name: item.name, ...(kind ? { kind } : {}) },
      ];
    }),
  );
}

export function mergeCardAssignees(
  primary: CardPerson | null,
  stored: CardPerson[],
): CardPerson[] {
  return uniquePeople([...(primary ? [primary] : []), ...stored]);
}

export function personGivenName(person: CardPerson): string {
  return person.name.trim().split(/\s+/)[0] || person.name;
}

export function personOriginLabel(
  person: CardPerson,
): "Land Grow" | "Cliente" | null {
  if (person.kind === "staff") return "Land Grow";
  if (person.kind === "member") return "Cliente";
  return null;
}

export function personLabel(person: CardPerson): string {
  const origin = personOriginLabel(person);
  return origin ? `${person.name} · ${origin}` : person.name;
}

export function mentionQuery(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const before = text.slice(0, Math.max(0, caret));
  const match = /(?:^|\s)@([^\s@]*)$/.exec(before);
  if (!match) return null;
  const query = match[1] ?? "";
  return { start: before.length - query.length - 1, query };
}

export function insertMention(
  text: string,
  caret: number,
  name: string,
): { text: string; caret: number } {
  const found = mentionQuery(text, caret);
  if (!found) {
    const next = `${text}@${name} `;
    return { text: next, caret: next.length };
  }
  const next = `${text.slice(0, found.start)}@${name} ${text.slice(caret)}`;
  const nextCaret = found.start + name.length + 2;
  return { text: next, caret: nextCaret };
}

export function extractMentionIds(
  text: string,
  people: CardPerson[],
): string[] {
  const sorted = [...people].sort((a, b) => b.name.length - a.name.length);
  const lower = text.toLowerCase();
  const ids: string[] = [];
  for (const person of sorted) {
    if (person.name && lower.includes(`@${person.name.toLowerCase()}`)) {
      ids.push(person.userId);
    }
  }
  return [...new Set(ids)];
}

export function commentSegments(
  text: string,
  people: CardPerson[],
): { text: string; mention: boolean }[] {
  const names = [...people]
    .map((person) => person.name)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (names.length === 0) return [{ text, mention: false }];
  const pattern = new RegExp(
    `(@(?:${names.map(escapeRegExp).join("|")}))`,
    "gi",
  );
  const known = new Set(names.map((name) => name.toLowerCase()));
  return text.split(pattern).flatMap((part) => {
    if (!part) return [];
    const mention =
      part.startsWith("@") && known.has(part.slice(1).toLowerCase());
    return [{ text: part, mention }];
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
