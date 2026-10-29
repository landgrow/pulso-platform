export interface SalaUnreadRow {
  channelId: string;
  authorId: string;
  createdAt: string;
}

/** Quantas mensagens de outras pessoas ainda não foram abertas. */
export function tallySalaUnread(
  messages: SalaUnreadRow[],
  lastReadByChannel: Map<string, string | null>,
  userId: string,
): number {
  let total = 0;
  for (const row of messages) {
    if (row.authorId === userId) continue;
    const lastRead = lastReadByChannel.get(row.channelId);
    if (!lastRead || row.createdAt > lastRead) total += 1;
  }
  return total;
}

export function formatSalaUnreadBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}
