import Link from "next/link";
import { AlertCircle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { listClientDirectory } from "@/app/actions/clientes";
import { getIsPlatformAdmin } from "@/app/actions/admin";
import { PROGRAMA_LABELS, type ClientDirectoryEntry } from "@/types/clientes";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { NovoClienteSheet } from "./novo-cliente-sheet";

function contratosAtivos(entry: ClientDirectoryEntry) {
  return entry.contratos.filter((c) => c.status === "ativo");
}

function valorTotal(entry: ClientDirectoryEntry): string {
  const ativos = contratosAtivos(entry);
  if (ativos.length === 0) return "—";
  const moeda = ativos[0]!.moeda;
  const total = ativos.reduce((sum, c) => sum + c.valor, 0);
  return formatCurrency(total, moeda);
}

function periodoContrato(entry: ClientDirectoryEntry): string {
  const ativos = contratosAtivos(entry);
  if (ativos.length === 0) return "—";
  const inicio = ativos.map((c) => c.data_inicio).sort()[0]!;
  const semFim = ativos.some((c) => !c.data_fim);
  if (semFim) return `${formatDate(inicio)} → em andamento`;
  const fim = ativos
    .map((c) => c.data_fim!)
    .sort()
    .at(-1)!;
  return `${formatDate(inicio)} → ${formatDate(fim)}`;
}

export default async function AdminClientesPage(): Promise<JSX.Element> {
  const [result, { isAdmin }] = await Promise.all([
    listClientDirectory(),
    getIsPlatformAdmin(),
  ]);

  if (!result.success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
            <h1 className="text-xl font-semibold mb-2">Acesso negado</h1>
            <p className="text-text-2 text-sm">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clientes = result.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizações"
        description="Carteira de clientes: contrato, time e acesso. Novo cliente e convite de login ficam aqui — não há aba Acessos."
        {...(isAdmin ? { actions: <NovoClienteSheet /> } : {})}
      />

      <Card>
        <CardContent className="p-0">
          {clientes.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-text-2 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum cliente ainda
              </h3>
              <p className="text-text-2 text-sm">
                {isAdmin
                  ? "Use Novo cliente para criar a organização e enviar o convite."
                  : "Nenhum cliente atribuído a você."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Dono</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Programa(s)</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => {
                  const ativos = contratosAtivos(c);
                  const isEncerrado = !!c.deleted_at;
                  return (
                    <TableRow
                      key={c.org_id}
                      className={isEncerrado ? "opacity-60" : undefined}
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/clientes/${c.slug}`}
                          className="hover:text-primary hover:underline"
                        >
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-text-2">
                        {c.owner_name ?? c.owner_email ?? "—"}
                      </TableCell>
                      <TableCell className="text-text-2">
                        {c.member_emails.length}{" "}
                        {c.member_emails.length === 1 ? "usuário" : "usuários"}
                      </TableCell>
                      <TableCell>
                        {ativos.length === 0 ? (
                          <span className="text-text-2">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {ativos.map((ct) => (
                              <Badge
                                key={ct.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {PROGRAMA_LABELS[ct.programa].split(" —")[0]}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-text-2">
                        {valorTotal(c)}
                      </TableCell>
                      <TableCell className="text-text-2 whitespace-nowrap">
                        {periodoContrato(c)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isEncerrado ? "outline" : "success"}>
                          {isEncerrado ? "Encerrado" : "Ativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
