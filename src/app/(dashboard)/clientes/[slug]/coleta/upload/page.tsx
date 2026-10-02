import { notFound } from "next/navigation";
import { getOrCreateCurrentPeriod, getPeriod } from "@/app/actions/periods";
import { authorizeClientSlug } from "@/lib/auth/org-access";
import { UploadQueue } from "@/components/collections/upload/upload-queue";
import { Badge } from "@/components/ui/badge";
import { UploadCloud } from "lucide-react";

interface UploadPageProps {
  params: Promise<{ slug: string }>;
}

export default async function UploadPage({
  params,
}: UploadPageProps): Promise<JSX.Element> {
  const { slug } = await params;

  const auth = await authorizeClientSlug(slug);
  if (!auth.ok) notFound();
  const orgCtx = { org: auth.org };

  const periodResult = await getOrCreateCurrentPeriod(auth.org.id);
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

  const user = auth.access.user;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <div className="mb-2 flex items-center gap-3 text-sm text-muted-foreground">
          <a
            href={`/clientes/${slug}/coleta`}
            className="transition-colors hover:text-foreground"
          >
            {orgCtx.org.name}
          </a>
          <span>/</span>
          <span>Coleta de dados</span>
          <span>/</span>
          <span className="font-medium text-foreground">
            Upload de arquivos
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <UploadCloud className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Upload de Arquivos</h1>
            <p className="text-sm text-muted-foreground">
              Envie PDFs, planilhas Excel ou CSV como evidência para este
              período.
            </p>
          </div>
          {isReadOnly && (
            <Badge variant="outline" className="ml-auto shrink-0">
              Somente leitura
            </Badge>
          )}
        </div>
      </div>

      <UploadQueue
        periodoId={periodId}
        orgId={orgCtx.org.id}
        initialEvidencias={periodDetail.data.period.evidencias}
        currentUserId={user?.id ?? null}
        canDeleteAny={canDeleteAny}
        readOnly={isReadOnly}
      />
    </div>
  );
}
