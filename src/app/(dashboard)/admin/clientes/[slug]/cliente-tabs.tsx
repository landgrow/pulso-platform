"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  Share2,
  Contact,
  Radar,
  Briefcase,
  ClipboardList,
  UserPlus,
  FileText,
  FolderOpen,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  PROGRAMA_LABELS,
  TEAM_ROLE_LABELS,
  type ClientDirectoryEntry,
} from "@/types/clientes";
import type { BinSummary } from "@/app/actions/bin";
import type { MinSummary } from "@/app/actions/min";
import { BinHqReview } from "@/components/bin/bin-hq-review";
import { MinResults } from "@/components/admin/min-results";
import { AtividadesShell } from "@/components/atividades/atividades-shell";
import { MindMapCanvas } from "@/components/mindmaps/mind-map-canvas";
import { CrmShell } from "@/components/crm/crm-shell";
import { ClienteDocumentos } from "@/components/admin/cliente-documentos";
import { FadeSwap } from "@/components/ui/fade-swap";
import { AddTeamMemberForm } from "./add-team-member-form";
import { RemoveTeamMemberButton } from "./remove-team-member-button";
import { ContratoForm } from "./contrato-form";
import { EncerrarContratoButton } from "./encerrar-contrato-button";

type Tab =
  | "visao-geral"
  | "usuarios"
  | "contratos"
  | "bin"
  | "min"
  | "documentos"
  | "atividades"
  | "mapa-mental"
  | "crm";

const TABS: Tab[] = [
  "visao-geral",
  "usuarios",
  "contratos",
  "bin",
  "min",
  "documentos",
  "atividades",
  "mapa-mental",
  "crm",
];

interface Props {
  orgId: string;
  entry: ClientDirectoryEntry | null;
  bin: BinSummary | null;
  min: MinSummary | null;
  viewerRole: string;
  isEncerrado: boolean;
  /** CRM sempre roda na org interna da Land Grow (mesmo kanban de Leads/Parceiros), não na org deste cliente. */
  internalOrgId: string | null;
}

/** Abas do detalhe de cliente — Atividades e Mapa Mental usam os mesmos componentes do painel interno da Land Grow, só trocando a org. */
export function AdminClienteTabs({
  orgId,
  entry,
  bin,
  min,
  viewerRole,
  isEncerrado,
  internalOrgId,
}: Props): JSX.Element {
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    TABS.includes(requested as Tab) ? (requested as Tab) : "visao-geral",
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        <TabButton
          icon={<LayoutGrid className="h-4 w-4" />}
          label="Visão Geral"
          active={tab === "visao-geral"}
          onClick={() => setTab("visao-geral")}
        />
        <TabButton
          icon={<UserPlus className="h-4 w-4" />}
          label="Usuários"
          active={tab === "usuarios"}
          onClick={() => setTab("usuarios")}
        />
        <TabButton
          icon={<FileText className="h-4 w-4" />}
          label="Contratos"
          active={tab === "contratos"}
          onClick={() => setTab("contratos")}
        />
        <TabButton
          icon={<Radar className="h-4 w-4" />}
          label="BIN"
          active={tab === "bin"}
          onClick={() => setTab("bin")}
        />
        <TabButton
          icon={<Briefcase className="h-4 w-4" />}
          label="MIN"
          active={tab === "min"}
          onClick={() => setTab("min")}
        />
        <TabButton
          icon={<FolderOpen className="h-4 w-4" />}
          label="Documentos"
          active={tab === "documentos"}
          onClick={() => setTab("documentos")}
        />
        <TabButton
          icon={<ClipboardList className="h-4 w-4" />}
          label="Atividades"
          active={tab === "atividades"}
          onClick={() => setTab("atividades")}
        />
        <TabButton
          icon={<Share2 className="h-4 w-4" />}
          label="Mapa Mental"
          active={tab === "mapa-mental"}
          onClick={() => setTab("mapa-mental")}
        />
        <TabButton
          icon={<Contact className="h-4 w-4" />}
          label="CRM"
          active={tab === "crm"}
          onClick={() => setTab("crm")}
        />
      </div>

      <FadeSwap swapKey={tab}>
        {tab === "visao-geral" && <VisaoGeralTab entry={entry} />}
        {tab === "usuarios" && (
          <UsuariosTab
            orgId={orgId}
            entry={entry}
            viewerRole={viewerRole}
            isEncerrado={isEncerrado}
          />
        )}
        {tab === "contratos" && (
          <ContratosTab
            entry={entry}
            viewerRole={viewerRole}
            isEncerrado={isEncerrado}
          />
        )}
        {tab === "bin" && <BinTab bin={bin} />}
        {tab === "min" && <MinTab min={min} />}
        {tab === "documentos" && <ClienteDocumentos orgId={orgId} />}
        {tab === "atividades" && <AtividadesShell orgId={orgId} />}
        {tab === "mapa-mental" && <MindMapCanvas orgId={orgId} />}
        {tab === "crm" &&
          (internalOrgId ? (
            <CrmShell orgId={internalOrgId} />
          ) : (
            <p className="text-sm text-text-2">
              Organização interna não encontrada. Rode a migration
              0012_operacao_interna.sql no Supabase.
            </p>
          ))}
      </FadeSwap>
    </div>
  );
}

function VisaoGeralTab({
  entry,
}: {
  entry: ClientDirectoryEntry | null;
}): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dados gerais</CardTitle>
        <CardDescription>
          Quem é o dono. Usuários, contratos, BIN e MIN ficam nas abas ao lado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-text-2 mb-1">Dono</p>
        <p className="text-sm">
          {entry?.owner_name ?? entry?.owner_email ?? "—"}
        </p>
      </CardContent>
    </Card>
  );
}

function UsuariosTab({
  orgId,
  entry,
  viewerRole,
  isEncerrado,
}: Pick<Props, "orgId" | "entry" | "viewerRole" | "isEncerrado">): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Usuários</CardTitle>
        <CardDescription>
          Quem entra no PULSO desta empresa. {entry?.members.length ?? 0} no
          time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!entry || entry.members.length === 0 ? (
          <p className="text-sm text-text-2">Nenhum usuário ainda.</p>
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
                      orgId={orgId}
                      userId={m.user_id}
                      email={m.email}
                    />
                  )}
              </div>
            ))}
          </div>
        )}
        {viewerRole === "platform_admin" && !isEncerrado && (
          <div className="pt-4 border-t border-border">
            <p className="text-sm font-medium mb-3">Cadastrar usuário</p>
            <AddTeamMemberForm orgId={orgId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContratosTab({
  entry,
  viewerRole,
  isEncerrado,
}: Pick<Props, "entry" | "viewerRole" | "isEncerrado">): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contratos</CardTitle>
        <CardDescription>Programa e valor deste cliente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  {c.status === "ativo" && viewerRole === "platform_admin" && (
                    <EncerrarContratoButton contratoId={c.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {viewerRole === "platform_admin" &&
          entry?.cliente_id &&
          !isEncerrado && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium mb-3">Novo contrato</p>
              <ContratoForm clienteId={entry.cliente_id} />
            </div>
          )}
      </CardContent>
    </Card>
  );
}

function BinTab({ bin }: { bin: BinSummary | null }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-text-2" />
          <CardTitle className="text-lg">BIN</CardTitle>
        </div>
        <CardDescription>
          Cada bloco enviado pelo cliente chega aqui, com as respostas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!bin?.payload && (bin?.flow.events.length ?? 0) === 0 ? (
          <p className="text-sm text-text-2">
            Ainda sem respostas. Quando o cliente enviar o diagnóstico geral ou
            um setor, o texto aparece nesta aba.
          </p>
        ) : (
          <BinHqReview
            payload={bin?.payload ?? {}}
            route={bin?.route ?? null}
            flow={
              bin?.flow ?? {
                geralEnviadoEm: null,
                diagnosticoEnviadoEm: null,
                setoresEnviados: {},
                events: [],
              }
            }
            periodoLabel={bin?.periodoLabel ?? null}
          />
        )}
      </CardContent>
    </Card>
  );
}

function MinTab({ min }: { min: MinSummary | null }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-text-2" />
          <CardTitle className="text-lg">MIN</CardTitle>
        </div>
        <CardDescription>
          {min?.blocosPreenchidos ?? 0} de 13 blocos recebidos
          {min?.ultimaAtualizacao
            ? ` · atualizado em ${formatDate(min.ultimaAtualizacao)}`
            : ""}
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MinResults
          title={null}
          lead={null}
          showOrg={false}
          items={(min?.blocos ?? []).map((bloco) => ({
            id: bloco.bloco,
            orgName: "",
            orgSlug: "",
            href: "",
            nome: bloco.nome,
            updatedAt: bloco.updatedAt,
            perguntas: bloco.perguntas,
          }))}
          empty="Ainda sem bloco concluído. Quando o cliente terminar um bloco, as respostas aparecem nesta aba."
        />
      </CardContent>
    </Card>
  );
}

function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
        active
          ? "border-primary text-primary"
          : "border-transparent text-text-2 hover:text-text-1",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
