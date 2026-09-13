"use client";

import { useState, type ReactNode } from "react";
import {
  LayoutGrid,
  Share2,
  Contact,
  Radar,
  Briefcase,
  ClipboardList,
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
import { FORMULARIO_BLOCOS } from "@/lib/formulario-questions";
import {
  PROGRAMA_LABELS,
  TEAM_ROLE_LABELS,
  type ClientDirectoryEntry,
} from "@/types/clientes";
import type { BinSummary } from "@/app/actions/bin";
import type { MinSummary } from "@/app/actions/min";
import { AtividadesShell } from "@/components/atividades/atividades-shell";
import { MindMapCanvas } from "@/components/mindmaps/mind-map-canvas";
import { CrmShell } from "@/components/crm/crm-shell";
import { AddTeamMemberForm } from "./add-team-member-form";
import { RemoveTeamMemberButton } from "./remove-team-member-button";
import { ContratoForm } from "./contrato-form";
import { EncerrarContratoButton } from "./encerrar-contrato-button";

type Tab = "visao-geral" | "atividades" | "mapa-mental" | "crm";

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
  const [tab, setTab] = useState<Tab>("visao-geral");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        <TabButton
          icon={<LayoutGrid className="h-4 w-4" />}
          label="Visão Geral"
          active={tab === "visao-geral"}
          onClick={() => setTab("visao-geral")}
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

      {tab === "visao-geral" && (
        <VisaoGeralTab
          orgId={orgId}
          entry={entry}
          bin={bin}
          min={min}
          viewerRole={viewerRole}
          isEncerrado={isEncerrado}
        />
      )}
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
    </div>
  );
}

function VisaoGeralTab({
  orgId,
  entry,
  bin,
  min,
  viewerRole,
  isEncerrado,
}: Omit<Props, "internalOrgId">): JSX.Element {
  return (
    <div className="space-y-6">
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
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm font-medium mb-3">Adicionar ao time</p>
                <AddTeamMemberForm orgId={orgId} />
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
    </div>
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
