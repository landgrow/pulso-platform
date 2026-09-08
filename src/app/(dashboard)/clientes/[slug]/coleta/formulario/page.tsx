import { notFound } from "next/navigation";
import { getOrCreateCurrentPeriod, getPeriod } from "@/app/actions/periods";
import { getColecao } from "@/app/actions/colecoes";
import { requireOrganization } from "@/lib/supabase/organization-server";
import { FormularioClient } from "@/components/collections/formulario/formulario-client";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { FormularioPayload } from "@/lib/validations/formulario";

interface FormularioPageProps {
  params: Promise<{ slug: string }>;
}

export default async function FormularioPage({
  params,
}: FormularioPageProps): Promise<JSX.Element> {
  const { slug } = await params;

  // Garante org ativa
  const orgCtx = await requireOrganization().catch(() => null);
  if (!orgCtx) notFound();

  // Valida slug
  if (orgCtx.org.slug !== slug) notFound();

  // Pega ou cria período do mês atual
  const periodResult = await getOrCreateCurrentPeriod();
  if (!periodResult.success) {
    return (
      <div className="p-6 text-destructive">
        Erro ao abrir período: {periodResult.error}
      </div>
    );
  }
  const { periodId } = periodResult.data;

  // Carrega período completo para saber se está editável
  // (canEdit já considera status fechado/analisado + papel do usuário — não duplica a regra aqui)
  const periodDetail = await getPeriod({ periodId });
  const isReadOnly = !periodDetail.success || !periodDetail.data.period.canEdit;

  // Carrega coleção de formulário existente (se houver)
  const colecaoResult = await getColecao(periodId, "formulario");
  const initialPayload: Partial<FormularioPayload> =
    colecaoResult.success && colecaoResult.data.colecao
      ? (colecaoResult.data.colecao.payload as Partial<FormularioPayload>)
      : {};

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
          <a
            href={`/clientes/${slug}`}
            className="hover:text-foreground transition-colors"
          >
            {orgCtx.org.name}
          </a>
          <span>/</span>
          <span>Coleta de dados</span>
          <span>/</span>
          <span className="font-medium text-foreground">Formulário</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Formulário de Coleta</h1>
            <p className="text-sm text-muted-foreground">
              Responda as perguntas sobre sua empresa. As respostas são salvas
              automaticamente.
            </p>
          </div>
          {isReadOnly && (
            <Badge variant="outline" className="ml-auto shrink-0">
              Somente leitura
            </Badge>
          )}
        </div>
      </div>

      {/* Formulário */}
      <FormularioClient
        periodoId={periodId}
        initialPayload={initialPayload}
        readOnly={isReadOnly}
      />
    </div>
  );
}
