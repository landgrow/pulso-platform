import { Activity, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuditLog } from "@/app/actions/audit-log";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AuditLogPage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const currentPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  const result = await getAuditLog(currentPage);

  if (!result.success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
            <h1 className="text-xl font-semibold mb-2">Acesso negado</h1>
            <p className="text-text-2 text-sm">{result.error}</p>
            <p className="text-text-2 text-xs mt-4">
              Esta página é restrita a administradores da plataforma
              (platform_admin).
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { entries, total } = result;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <Badge variant="outline" className="text-text-2">
            admin only
          </Badge>
        </div>
        <p className="text-text-2">
          Histórico de ações sensíveis realizadas na plataforma. Total: {total}{" "}
          registro(s).
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Eventos recentes</CardTitle>
          </div>
          <CardDescription>
            Cada entrada registra: ação, recurso afetado, usuário, organização e
            timestamp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-text-2 text-center py-8">
              Nenhum evento registrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-2">
                    <th className="py-2 pr-4 font-medium">Quando</th>
                    <th className="py-2 pr-4 font-medium">Ação</th>
                    <th className="py-2 pr-4 font-medium">Recurso</th>
                    <th className="py-2 pr-4 font-medium">Usuário</th>
                    <th className="py-2 font-medium">Organização</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border/50 hover:bg-surface-1"
                    >
                      <td className="py-3 pr-4 text-text-2 text-xs whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            entry.action === "DELETE"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {entry.action}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {entry.resource_type && (
                          <code className="text-text-1">
                            {entry.resource_type}
                            {entry.resource_id && (
                              <span className="text-text-2">
                                #{entry.resource_id.slice(0, 8)}
                              </span>
                            )}
                          </code>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-text-2">
                        {entry.user_name ?? "—"}
                      </td>
                      <td className="py-3 text-xs text-text-2">
                        {entry.org_name ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-2">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              asChild={currentPage > 1}
            >
              {currentPage > 1 ? (
                <a href={`?page=${currentPage - 1}`}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </a>
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              asChild={currentPage < totalPages}
            >
              {currentPage < totalPages ? (
                <a href={`?page=${currentPage + 1}`}>
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </a>
              ) : (
                <>
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
