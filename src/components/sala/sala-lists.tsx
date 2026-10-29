"use client";

import { useEffect, useState } from "react";
import {
  addSalaListItem,
  createSalaList,
  listSalaLists,
  toggleSalaListItem,
} from "@/app/actions/sala-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SalaList } from "@/types/sala";

export function SalaLists({ channelId }: { channelId?: string }): JSX.Element {
  const [lists, setLists] = useState<SalaList[]>([]);
  const [title, setTitle] = useState("");
  const [itemTitle, setItemTitle] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    const result = channelId
      ? await listSalaLists(channelId)
      : await listSalaLists();
    if (result.success) setLists(result.data);
    else setError(result.error);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = channelId
        ? await listSalaLists(channelId)
        : await listSalaLists();
      if (cancelled) return;
      if (result.success) setLists(result.data);
      else setError(result.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h2 className="text-xl font-semibold text-text-1">
        {channelId ? "Rastreador" : "Listas"}
      </h2>
      <p className="mt-1 text-sm leading-6 text-text-2">
        {channelId
          ? "Checklist deste canal. Crie uma lista, acrescente itens e marque o que já fez. Não substitui o CRM nem o Plano de Ação — é só o combinado da conversa."
          : "Checklists da operação. Cada lista é um bloco de itens para marcar. As listas de um canal também aparecem na aba Rastreador desse canal."}
      </p>
      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            const result = channelId
              ? await createSalaList(title, channelId)
              : await createSalaList(title);
            if (!result.success) {
              setError(result.error);
              return;
            }
            setTitle("");
            await refresh();
          })();
        }}
      >
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Nome da lista, ex.: Entregas da semana"
        />
        <Button type="submit">Criar lista</Button>
      </form>
      {lists.length === 0 ? (
        <p className="mt-6 text-sm text-text-3">
          Nenhuma lista ainda. Crie uma acima ou use um modelo na aba Notas.
        </p>
      ) : null}
      <div className="mt-6 space-y-4">
        {lists.map((list) => (
          <section
            key={list.id}
            className="rounded-xl border border-border p-4"
          >
            <h3 className="text-sm font-semibold text-text-1">{list.title}</h3>
            <ul className="mt-2 space-y-1">
              {list.items.map((item) => (
                <li key={item.id}>
                  <label className="flex items-center gap-2 text-sm text-text-1">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(event) => {
                        void toggleSalaListItem(
                          item.id,
                          event.target.checked,
                        ).then(() => refresh());
                      }}
                    />
                    <span
                      className={cn(item.done && "text-text-3 line-through")}
                    >
                      {item.title}
                    </span>
                    {item.dueOn ? (
                      <span className="text-[11px] text-text-3">
                        {item.dueOn}
                      </span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const value = (itemTitle[list.id] ?? "").trim();
                if (!value) return;
                void addSalaListItem(list.id, value).then(() => {
                  setItemTitle((current) => ({ ...current, [list.id]: "" }));
                  void refresh();
                });
              }}
            >
              <Input
                value={itemTitle[list.id] ?? ""}
                onChange={(event) =>
                  setItemTitle((current) => ({
                    ...current,
                    [list.id]: event.target.value,
                  }))
                }
                placeholder="Item"
                className="h-9 text-sm"
              />
              <Button type="submit" size="sm" variant="outline">
                Adicionar
              </Button>
            </form>
          </section>
        ))}
      </div>
    </div>
  );
}
