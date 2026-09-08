import type { TimelineEntry } from "@/types/collections";
import { RevisionItem } from "./revision-item";

interface TimelineProps {
  entries: TimelineEntry[];
  currentUserId: string | null;
  canRestore: boolean;
}

export function Timeline({
  entries,
  currentUserId,
  canRestore,
}: TimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhum histórico de alterações neste período ainda.
      </p>
    );
  }

  const payloadByKey = new Map<string, Record<string, unknown>>();
  for (const entry of entries) {
    payloadByKey.set(`${entry.colecaoId}:${entry.revNumber}`, entry.payload);
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <RevisionItem
          key={`${entry.colecaoId}:${entry.revNumber}`}
          entry={entry}
          previousPayload={payloadByKey.get(
            `${entry.colecaoId}:${entry.revNumber - 1}`,
          )}
          currentUserId={currentUserId}
          canRestore={canRestore}
        />
      ))}
    </div>
  );
}
