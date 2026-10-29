import Link from "next/link";
import { Radar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { BinInboxItem } from "@/app/actions/bin";

function kindLabel(kind: BinInboxItem["kind"]): string {
  if (kind === "geral") return "Geral";
  if (kind === "setor") return "Setores";
  if (kind === "rascunho") return "Rascunho";
  return "Completo";
}

export function BinInbox({
  items,
  title = "BIN por cliente",
  empty = "Nenhum cliente no BIN ainda. Quando alguém começar a responder, a empresa aparece aqui.",
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
        <p className="mt-1 text-sm text-text-2">
          Um diagnóstico por empresa. Clique para abrir a ficha.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface-1 px-4 py-6 text-sm text-text-2">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface-1">
          {items.map((item) => (
            <li key={item.orgSlug}>
              <Link
                href={item.href}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 hover:bg-surface-2"
              >
                <div>
                  <p className="text-sm font-medium">{item.orgName}</p>
                  <p className="mt-0.5 text-sm text-text-2">{item.headline}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
