export type DueKind = "atrasada" | "hoje" | "a_vencer";

export interface DueCard {
  id: string;
  titulo: string;
  prazo: string;
  prioridade: "alta" | "media" | "baixa";
  orgId: string;
  orgName: string;
  orgSlug: string;
  isInternal: boolean;
  boardName: string;
  columnLabel: string;
  responsavelNome: string | null;
  relatedOrgName: string | null;
  href: string;
}

export function classifyDue(prazo: string, today: string): DueKind {
  if (prazo < today) return "atrasada";
  if (prazo === today) return "hoje";
  return "a_vencer";
}

export function splitDueCards(
  cards: DueCard[],
  today: string,
): {
  atrasadas: DueCard[];
  hoje: DueCard[];
  aVencer: DueCard[];
} {
  const atrasadas: DueCard[] = [];
  const hoje: DueCard[] = [];
  const aVencer: DueCard[] = [];
  for (const card of cards) {
    const kind = classifyDue(card.prazo, today);
    if (kind === "atrasada") atrasadas.push(card);
    else if (kind === "hoje") hoje.push(card);
    else aVencer.push(card);
  }
  return { atrasadas, hoje, aVencer };
}
