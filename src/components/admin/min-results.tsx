import Link from "next/link";
import { Briefcase } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { MinInboxItem } from "@/app/actions/min";

export function MinResults({
  items,
  title = "MIN — o que o cliente enviou",
  lead = "Cada bloco concluído chega com as perguntas e as respostas.",
  empty = "Nenhum bloco ainda. Quando o cliente concluir um bloco do MIN, as respostas aparecem aqui.",
  showOrg = true,
}: {
  items: MinInboxItem[];
  title?: string | null;
  lead?: string | null;
  empty?: string;
  showOrg?: boolean;
}): JSX.Element {
  return (
    <section className="space-y-3">
      {title ? (
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Briefcase className="h-5 w-5 text-text-2" />
            {title}
          </h2>
          {lead ? <p className="text-sm text-text-2 mt-1">{lead}</p> : null}
        </div>
      ) : null}
      {items.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface-1 px-4 py-6 text-sm text-text-2">
          {empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-border bg-surface-1 px-4 py-3 space-y-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  {showOrg ? (
                    <Link
                      href={item.href}
                      className="text-sm font-medium hover:underline"
                    >
                      {item.orgName}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">{item.nome}</p>
                  )}
                  {showOrg ? (
                    <p className="text-sm text-text-2 mt-0.5">{item.nome}</p>
                  ) : null}
                </div>
                <span className="text-xs text-text-2">
                  {formatDate(item.updatedAt, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <dl className="space-y-3">
                {item.perguntas.map((row) => (
                  <div key={row.prompt}>
                    <dt className="text-xs text-text-2">{row.prompt}</dt>
                    <dd className="text-sm mt-0.5 whitespace-pre-wrap">
                      {row.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
