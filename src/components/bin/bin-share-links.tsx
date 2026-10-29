"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BIN_SECTION_DESCRIPTIONS, binShareUrl } from "@/lib/bin-v2/client";
import type { BinShareSection } from "@/lib/bin-v2/client";

export function BinShareLinks({
  slug,
  sections,
}: {
  slug: string;
  sections: BinShareSection[];
}): JSX.Element {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copy(sectionId: string, title: string): Promise<void> {
    const url = binShareUrl(window.location.origin, slug, sectionId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(sectionId);
      toast.success(`Link de ${title} copiado`);
      window.setTimeout(() => {
        setCopiedId((current) => (current === sectionId ? null : current));
      }, 1600);
    } catch {
      toast.error("Não deu para copiar o link");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-1 p-4">
      <div>
        <p className="text-sm font-medium">Enviar por setor</p>
        <p className="mt-1 text-xs text-text-2">
          Cada link abre só aquele formulário. Quem for responder precisa ter
          acesso a este cliente.
        </p>
      </div>
      <ul className="space-y-1.5">
        {sections.map((section) => (
          <li
            key={section.id}
            className="flex items-center gap-2 rounded-md px-1 py-1"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-text-1">{section.title}</p>
              <p className="truncate text-[11px] text-text-2">
                {BIN_SECTION_DESCRIPTIONS[section.id] ?? section.id}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void copy(section.id, section.title)}
            >
              {copiedId === section.id ? (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              Copiar link
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
