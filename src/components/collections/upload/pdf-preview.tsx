"use client";

interface PdfPreviewProps {
  signedUrl: string;
  filename: string;
}

/** Embed simples de PDF via <object> — cai pro link de download se o navegador não suportar embed. */
export function PdfPreview({ signedUrl, filename }: PdfPreviewProps) {
  return (
    <object
      data={signedUrl}
      type="application/pdf"
      className="h-[500px] w-full rounded-md border"
      aria-label={`Pré-visualização de ${filename}`}
    >
      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
        Não foi possível exibir o PDF aqui.{" "}
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          Abrir em outra aba
        </a>
        .
      </div>
    </object>
  );
}
