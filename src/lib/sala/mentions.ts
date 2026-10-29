import type { SalaStaff } from "@/types/sala";

export const PULSO_MENTION: SalaStaff = {
  userId: "pulso",
  name: "pulso",
};

export function salaMentionPeople(staff: SalaStaff[]): SalaStaff[] {
  const seen = new Set<string>([PULSO_MENTION.userId]);
  const people: SalaStaff[] = [PULSO_MENTION];
  for (const person of staff) {
    if (!person.userId || seen.has(person.userId)) continue;
    seen.add(person.userId);
    people.push(person);
  }
  return people;
}

export function filterSalaMentions(
  people: SalaStaff[],
  query: string,
): SalaStaff[] {
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? people.filter((person) => person.name.toLowerCase().includes(needle))
    : people;
  return matches.slice(0, 8);
}

export function salaMentionLabel(person: SalaStaff): string {
  if (person.userId === PULSO_MENTION.userId) return "PULSO · operação";
  return person.name;
}
