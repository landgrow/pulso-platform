"use client";

import { useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  commentSegments,
  extractMentionIds,
  insertMention,
  mentionQuery,
  personLabel,
  type CardPerson,
} from "@/lib/boards/card-people";
import { cn } from "@/lib/utils";

export function CommentText({
  text,
  people,
}: {
  text: string;
  people: CardPerson[];
}): JSX.Element {
  const parts = commentSegments(text, people);
  return (
    <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">
      {parts.map((part, index) =>
        part.mention ? (
          <span
            key={`${part.text}-${index}`}
            className="font-medium text-primary"
          >
            {part.text}
          </span>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </p>
  );
}

export function CommentBox({
  people,
  sending,
  error,
  onSend,
}: {
  people: CardPerson[];
  sending: boolean;
  error: string | null;
  onSend: (texto: string, mentions: string[]) => Promise<void>;
}): JSX.Element {
  const [text, setText] = useState("");
  const [caret, setCaret] = useState(0);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const query = mentionQuery(text, caret);
  const suggestions = useMemo(() => {
    if (!query) return [];
    const needle = query.query.toLowerCase();
    return people
      .filter((person) => person.name.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [people, query]);

  function applyMention(person: CardPerson): void {
    const next = insertMention(text, caret, person.name);
    setText(next.text);
    setCaret(next.caret);
    requestAnimationFrame(() => {
      const node = areaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(next.caret, next.caret);
    });
  }

  async function submit(): Promise<void> {
    const texto = text.trim();
    if (!texto || sending) return;
    await onSend(texto, extractMentionIds(texto, people));
    setText("");
    setCaret(0);
  }

  return (
    <div className="border-t border-border p-3 space-y-2">
      <div className="relative">
        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setCaret(e.target.selectionStart);
          }}
          onKeyUp={(e) => setCaret(e.currentTarget.selectionStart)}
          onClick={(e) => setCaret(e.currentTarget.selectionStart)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void submit();
            }
            if (e.key === "Escape" && suggestions.length > 0) {
              e.preventDefault();
              setCaret(text.length);
            }
          }}
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          placeholder="Escreva um comentário… use @ para marcar alguém"
          disabled={sending}
        />
        {suggestions.length > 0 ? (
          <div className="absolute bottom-full left-0 right-0 z-20 mb-1 overflow-hidden rounded-md border border-border bg-surface-1 shadow-md">
            {suggestions.map((person) => (
              <button
                key={person.userId}
                type="button"
                className={cn(
                  "block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2",
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyMention(person);
                }}
              >
                {personLabel(person)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {error ? <p className="text-xs text-error">{error}</p> : null}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => void submit()}
          disabled={sending || !text.trim()}
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {sending ? "Enviando..." : "Enviar"}
        </Button>
      </div>
    </div>
  );
}
