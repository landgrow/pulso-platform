import Link from "next/link";
import { Radar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { BinInboxItem } from "@/app/actions/bin";

function kindLabel(kind: BinInboxItem["kind"]): string {
  if (kind === "geral") return "Geral";
  if (kind === "setor") return "Setor";
  if (kind === "rascunho") return "Rascunho";
  return "Completo";
}

export function BinInbox({
  items,
  title = "BIN — o que o cliente enviou",
  empty = "Nenhum envio ainda. Quando o cliente mandar o diagnóstico geral ou um setor, aparece aqui e no e-mail da equipe.",
}: {
  items: BinInboxItem[];
  title?: string;
  empty?: string;
}): JSX.Element {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Radar className="h-5 w-5 text-text-2" />
          {title}
        </h2>
        <p className="text-sm text-text-2 mt-1">
          É da ficha do cliente que a Land Grow lê as respostas e faz o
          diagnóstico.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface-1 px-4 py-6 text-sm text-text-2">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface-1">
          {items.map((item) => (
            <li key={`${item.orgSlug}-${item.kind}-${item.at}`}>
              <Link
                href={item.href}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 hover:bg-surface-2"
              >
                <div>
                  <p className="text-sm font-medium">{item.orgName}</p>
                  <p className="text-sm text-text-2 mt-0.5">{item.headline}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline">{kindLabel(item.kind)}</Badge>
                  <span className="text-xs text-text-2">
                    {formatDate(item.at, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
