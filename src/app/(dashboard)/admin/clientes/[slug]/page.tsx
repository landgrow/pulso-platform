import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  Radar,
  Briefcase,
  LogIn,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdminOrgAccess } from "@/lib/supabase/admin-organization-server";
import {
  getClienteDirectoryEntry,
  viewClienteAsAdmin,
} from "@/app/actions/clientes";
import { getBinSummaryForOrg } from "@/app/actions/bin";
import { getMinSummaryForOrg } from "@/app/actions/min";
import { PROGRAMA_LABELS, TEAM_ROLE_LABELS } from "@/types/clientes";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PlaceholderSection } from "@/components/admin/placeholder-section";
import { FORMULARIO_BLOCOS } from "@/lib/formulario-questions";
import { ContratoForm } from "./contrato-form";
import { EncerrarContratoButton } from "./encerrar-contrato-button";
import { AddTeamMemberForm } from "./add-team-member-form";
import { RemoveTeamMemberButton } from "./remove-team-member-button";
import { ToggleClienteStatusButton } from "./toggle-cliente-status-button";

export default async function AdminClienteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const { org, viewerRole } = await requireAdminOrgAccess(slug);

  const [entryResult, binResult, minResult] = await Promise.all([
    getClienteDirectoryEntry(org.id),
    getBinSummaryForOrg(org.id),
    getMinSummaryForOrg(org.id),
  ]);

  const entry = entryResult.success ? entryResult.data : null;
  const bin = binResult.success ? binResult.data : null;
  const min = minResult.success ? minResult.data : null;
  const isEncerrado = !!entry?.deleted_at;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/clientes"
            className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text-1 mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Organizações
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
            <Badge variant="outline" className="text-text-2">
              {org.slug}
            </Badge>
            <Badge variant={isEncerrado ? "outline" : "success"}>
              {isEncerrado ? "Encerrado" : "Ativo"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEncerrado && (
            <form action={viewClienteAsAdmin.bind(null, org.id)}>
              <Button type="submit" variant="outline" size="sm">
                <LogIn className="mr-1.5 h-3.5 w-3.5" />
                Entrar como membro
              </Button>
            </form>
          )}
          {viewerRole === "platform_admin" && (
            <ToggleClienteStatusButton
              orgId={org.id}
              isEncerrado={isEncerrado}
              orgName={org.name}
            />
          )}
        </div>
      </div>

      {/* Dados gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados gerais</CardTitle>
          <CardDescription>
            Dono, time e contratos deste cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-xs text-text-2 mb-1">Dono</p>
            <p className="text-sm">
              {entry?.owner_name ?? entry?.owner_email ?? "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-text-2 mb-2">
              Time ({entry?.members.length ?? 0})
            </p>
            {!entry || entry.members.length === 0 ? (
              <p className="text-sm text-text-2">—</p>
            ) : (
              <div className="space-y-2">
                {entry.members.map((m) => (
                  <div
                    key={m.user_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm truncate">{m.email}</p>
                      <p className="text-xs text-text-2">
                        {TEAM_ROLE_LABELS[m.role]}
                      </p>
                    </div>
                    {viewerRole === "platform_admin" &&
                      m.role !== "client_owner" && (
                        <RemoveTeamMemberButton
                          orgId={org.id}
                          userId={m.user_id}
                          email={m.email}
                        />
                      )}
                  </div>
                ))}
              </div>
            )}
            {viewerRole === "platform_admin" && !isEncerrado && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm font-medium mb-3">Adicionar ao time</p>
                <AddTeamMemberForm orgId={org.id} />
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-text-2 mb-2">Contratos</p>
            {!entry || entry.contratos.length === 0 ? (
              <p className="text-sm text-text-2">
                Nenhum contrato registrado ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {entry.contratos.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {PROGRAMA_LABELS[c.programa]}
                      </p>
                      <p className="text-xs text-text-2">
                        {formatCurrency(c.valor, c.moeda)} ·{" "}
                        {formatDate(c.data_inicio)}
                        {c.data_fim
                          ? ` → ${formatDate(c.data_fim)}`
                          : " → em andamento"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          c.status === "ativo"
                            ? "success"
                            : c.status === "pausado"
                              ? "warning"
                              : "outline"
                        }
                      >
                        {c.status}
                      </Badge>
                      {c.status === "ativo" &&
                        viewerRole === "platform_admin" && (
                          <EncerrarContratoButton contratoId={c.id} />
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {viewerRole === "platform_admin" &&
            entry?.cliente_id &&
            !isEncerrado && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm font-medium mb-3">Novo contrato</p>
                <ContratoForm clienteId={entry.cliente_id} />
              </div>
            )}
        </CardContent>
      </Card>

      {/* BIN — dado real, vem do Motor de Coleções */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-text-2" />
            <CardTitle className="text-lg">BIN</CardTitle>
            {bin?.periodoLabel && (
              <Badge variant="outline" className="text-text-2">
                {bin.periodoLabel}
              </Badge>
            )}
          </div>
          <CardDescription>
            Business Insights Navigator — diagnóstico dos 6 setores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!bin?.payload ? (
            <p className="text-sm text-text-2">
              Este cliente ainda não respondeu o formulário de diagnóstico.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FORMULARIO_BLOCOS.map((bloco) => (
                <div
                  key={bloco.area}
                  className="rounded-lg border border-border bg-surface-1 p-4"
                >
                  <p className="text-sm font-medium mb-2">{bloco.area}</p>
                  <div className="space-y-2">
                    {bloco.perguntas.map((campo) => {
                      const raw =
                        bin.payload?.[campo.id as keyof typeof bin.payload];
                      const opt = campo.opcoes?.find((o) => o.value === raw);
                      const display =
                        raw === undefined || raw === null || raw === ""
                          ? "—"
                          : (opt?.label ??
                            (campo.sufixo
                              ? `${raw} ${campo.sufixo}`
                              : String(raw)));
                      return (
                        <div key={campo.id}>
                          <p className="text-xs text-text-2">{campo.label}</p>
                          <p className="text-sm">{display}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MIN — schema existe, mas ainda sem formulário de entrada */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-text-2" />
            <CardTitle className="text-lg">MIN</CardTitle>
          </div>
          <CardDescription>
            Modelo Integrado de Negócios — {min?.blocosPreenchidos ?? 0} de 13
            blocos preenchidos
            {min?.ultimaAtualizacao
              ? ` · atualizado em ${formatDate(min.ultimaAtualizacao)}`
              : ""}
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-2">
            {min && min.blocosPreenchidos > 0
              ? "Conteúdo preenchido — a tela de detalhe por bloco chega no Épico 3."
              : "Ainda não existe formulário pra preencher os blocos do MIN — próxima parte do Épico 3."}
          </p>
        </CardContent>
      </Card>

      {/* Placeholder honesto — sem dado real ainda */}
      <PlaceholderSection
        title="Atividades"
        epic="Épico 4"
        description="Quadro kanban real, ligado ao Supabase, chega no Épico 4 (Programa + Tarefas)."
        icon={ClipboardList}
      />
    </div>
  );
}
