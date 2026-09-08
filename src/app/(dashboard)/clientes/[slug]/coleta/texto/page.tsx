import { notFound } from "next/navigation";
import { getOrCreateCurrentPeriod, getPeriod } from "@/app/actions/periods";
import { listTextoLivre } from "@/app/actions/texto";
import { requireOrganization } from "@/lib/supabase/organization-server";
import { createClient } from "@/lib/supabase/server";
import { TextoPageClient } from "@/components/collections/texto/texto-page-client";
import { Badge } from "@/components/ui/badge";
import { NotebookPen } from "lucide-react";

interface TextoPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TextoPage({
  params,
}: TextoPageProps): Promise<JSX.Element> {
  const { slug } = await params;

  const orgCtx = await requireOrganization().catch(() => null);
  if (!orgCtx) notFound();
  if (orgCtx.org.slug !== slug) notFound();

  const periodResult = await getOrCreateCurrentPeriod();
  if (!periodResult.success) {
    return (
      <div className="p-6 text-destructive">
        Erro ao abrir período: {periodResult.error}
      </div>
    );
  }
  const { periodId } = periodResult.data;

  const periodDetail = await getPeriod({ periodId });
  if (!periodDetail.success) {
    return (
      <div className="p-6 text-destructive">
        Erro ao carregar período: {periodDetail.error}
      </div>
    );
  }

  const isReadOnly = !periodDetail.data.period.canEdit;
  const canDeleteAny = periodDetail.data.period.role === "platform_admin";

  const textosResult = await listTextoLivre({ periodoId: periodId });
  const initialTextos = textosResult.success ? textosResult.data.textos : [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <div className="mb-2 flex items-center gap-3 text-sm text-muted-foreground">
          <a
            href={`/clientes/${slug}`}
            className="transition-colors hover:text-foreground"
          >
            {orgCtx.org.name}
          </a>
          <span>/</span>
          <span>Coleta de dados</span>
          <span>/</span>
          <span className="font-medium text-foreground">Texto livre</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <NotebookPen className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Texto Livre</h1>
            <p className="text-sm text-muted-foreground">
              Registre observações, contexto ou qualquer informação relevante
              sobre a empresa.
            </p>
          </div>
          {isReadOnly && (
            <Badge variant="outline" className="ml-auto shrink-0">
              Somente leitura
            </Badge>
          )}
        </div>
      </div>

      <TextoPageClient
        periodoId={periodId}
        initialTextos={initialTextos}
        currentUserId={user?.id ?? null}
        canDeleteAny={canDeleteAny}
        readOnly={isReadOnly}
      />
    </div>
  );
}
