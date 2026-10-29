"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

export function PulsoChat({
  surface,
  orgId,
  slug,
  orgs,
  llmLabel,
  llmError,
}: {
  surface: "admin" | "client";
  orgId?: string;
  slug?: string;
  orgs?: { id: string; name: string }[];
  llmLabel?: string;
  llmError?: string;
}): JSX.Element {
  const [selectedOrg, setSelectedOrg] = useState(orgId ?? "");
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          surface,
          orgId: selectedOrg || null,
          slug: slug ?? null,
        }),
      }),
    [surface, selectedOrg, slug],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    id: `${surface}-${selectedOrg || "carteira"}`,
  });

  if (llmError) {
    return (
      <div className="rounded-lg border border-border bg-surface-1 p-4 text-sm space-y-2">
        <p className="font-medium">Chat ainda sem chave</p>
        <p className="text-text-2">{llmError}</p>
      </div>
    );
  }

  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="flex min-h-[28rem] flex-col rounded-lg border border-border bg-surface-1">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="text-sm text-text-2">
          Responde só com dados do PULSO. {llmLabel}
        </p>
        {surface === "admin" && orgs && orgs.length > 0 ? (
          <Select
            value={selectedOrg}
            onChange={(event) => setSelectedOrg(event.target.value)}
            className="w-56"
          >
            <option value="">Toda a carteira (resumo)</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-sm text-text-2">
            Pergunte pelo diagnóstico, pela última reunião ou pelo que está
            aberto. Se não estiver no PULSO, a resposta admite que não está.
          </p>
        ) : null}
        {messages.map((message) => (
          <div key={message.id} className="space-y-1">
            <p className="text-xs font-medium text-text-2">
              {message.role === "user" ? "Você" : "PULSO"}
            </p>
            {message.parts.map((part, index) =>
              part.type === "text" ? (
                <p
                  key={`${message.id}-${index}`}
                  className="whitespace-pre-wrap text-sm"
                >
                  {part.text}
                </p>
              ) : null,
            )}
          </div>
        ))}
        {error ? <p className="text-sm text-error">{error.message}</p> : null}
      </div>

      <form
        className="border-t border-border p-3 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          const text = input.trim();
          if (!text || busy) return;
          void sendMessage({ text });
          setInput("");
        }}
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="O que piorou desde o BIN? O que a última reunião mudou?"
          disabled={busy}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || !input.trim()}>
            Perguntar
          </Button>
        </div>
      </form>
    </div>
  );
}
