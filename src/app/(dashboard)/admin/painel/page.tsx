import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { listClientDirectory } from "@/app/actions/clientes";
import { PROGRAMA_LABELS, type ClientDirectoryEntry } from "@/types/clientes";
import { PageHeader, EmptyState } from "@/components/ui/page-header";

function programasAtivos(entry: ClientDirectoryEntry): string {
  const ativos = entry.contratos.filter((c) => c.status === "ativo");
  if (ativos.length === 0) return "Sem programa ativo";
  return ativos
    .map((c) => PROGRAMA_LABELS[c.programa].split(" —")[0])
    .join(" · ");
}

export default async function AdminPainelPage(): Promise<JSX.Element> {
  const supabase = await createClient();

  try {
    await requireCapability(supabase, "painel");
  } catch (e) {
    return (
      <AccessDenied
        message={
          e instanceof Error
            ? e.message
            : "Apenas administradores da plataforma."
        }
      />
    );
  }

  const result = await listClientDirectory();
  if (!result.success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
            <h1 className="text-xl font-semibold mb-2">
              Não foi possível listar
            </h1>
            <p className="text-text-2 text-sm">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ativos = result.data.filter((c) => !c.deleted_at);
  const encerrados = result.data.filter((c) => c.deleted_at);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel"
        description="Acompanhamento da carteira. BIN e MIN ficam na ficha de cada cliente — não neste workspace."
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <p className="text-xs uppercase tracking-wide text-text-2">Ativos</p>
          <p className="text-2xl font-semibold tabular-nums mt-1">
            {ativos.length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <p className="text-xs uppercase tracking-wide text-text-2">
            Encerrados
          </p>
          <p className="text-2xl font-semibold tabular-nums mt-1">
            {encerrados.length}
          </p>
        </div>
      </div>

      {ativos.length === 0 ? (
        <EmptyState
          title="Nenhum cliente ativo"
          description="Quando houver carteira, cada empresa aparece aqui para acompanhar o trabalho."
          action={
            <Link href="/admin/clientes" className="text-sm text-primary">
              Ir para Organizações
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ativos.map((c) => (
            <Link
              key={c.org_id}
              href={`/admin/clientes/${c.slug}`}
              className="rounded-lg border border-border bg-surface-1 p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{c.name}</p>
                <Badge variant="success">Ativo</Badge>
              </div>
              <p className="text-sm text-text-2 mt-1">{programasAtivos(c)}</p>
              <p className="text-xs text-text-2 mt-2">
                {c.owner_name ?? c.owner_email ?? "Sem dono"} ·{" "}
                {c.member_emails.length}{" "}
                {c.member_emails.length === 1 ? "acesso" : "acessos"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
