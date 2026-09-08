import Link from "next/link";
import { FileText, NotebookPen, Mic } from "lucide-react";
import type { Colecao, ColecaoTipo } from "@/types/collections";
import {
  calcProgresso,
  type FormularioPayload,
} from "@/lib/validations/formulario";
import { Badge } from "@/components/ui/badge";

const TIPO_ICON: Record<ColecaoTipo, typeof FileText> = {
  formulario: FileText,
  texto_livre: NotebookPen,
  transcricao_audio: Mic,
};

const TIPO_LABEL: Record<ColecaoTipo, string> = {
  formulario: "Formulário",
  texto_livre: "Texto livre",
  transcricao_audio: "Transcrição de áudio",
};

const TIPO_HREF: Record<ColecaoTipo, string> = {
  formulario: "coleta/formulario",
  texto_livre: "coleta/texto",
  transcricao_audio: "coleta/audio",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function preview(colecao: Colecao): string | null {
  if (colecao.tipo === "texto_livre") {
    const conteudo = colecao.payload.conteudo;
    if (typeof conteudo === "string")
      return conteudo.slice(0, 100) + (conteudo.length > 100 ? "…" : "");
  }
  if (colecao.tipo === "transcricao_audio") {
    const transcricao = colecao.payload.transcricao;
    if (typeof transcricao === "string")
      return transcricao.slice(0, 100) + (transcricao.length > 100 ? "…" : "");
  }
  return null;
}

interface ListaColecoesProps {
  colecoes: Colecao[];
  slug: string;
}

export function ListaColecoes({ colecoes, slug }: ListaColecoesProps) {
  const ativas = colecoes.filter((c) => c.status !== "descartado");

  if (ativas.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhuma coleção registrada neste período ainda.
      </p>
    );
  }

  const ordered = [...ativas].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  return (
    <div className="space-y-2">
      {ordered.map((colecao) => {
        const Icon = TIPO_ICON[colecao.tipo];
        const area =
          typeof colecao.metadata?.area === "string"
            ? (colecao.metadata.area as string)
            : null;
        const text = preview(colecao);

        return (
          <Link
            key={colecao.id}
            href={`/clientes/${slug}/${TIPO_HREF[colecao.tipo]}`}
            className="flex items-start gap-3 rounded-md border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
          >
            <Icon
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{TIPO_LABEL[colecao.tipo]}</span>
                {area && <Badge variant="outline">{area}</Badge>}
                {colecao.tipo === "formulario" && (
                  <span className="text-xs text-muted-foreground">
                    {calcProgresso(
                      colecao.payload as Partial<FormularioPayload>,
                    )}
                    % preenchido
                  </span>
                )}
              </div>
              {text && (
                <p className="mt-1 truncate text-muted-foreground">{text}</p>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDate(colecao.updated_at)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
