"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DriveConnect } from "@/app/(dashboard)/configuracoes/integracoes/drive-connect";
import { GoogleConnectButton } from "@/app/(dashboard)/configuracoes/integracoes/google-connect-button";
import {
  createWorkspaceAutomation,
  createWorkspaceIntegration,
  deleteWorkspaceAutomation,
  deleteWorkspaceIntegration,
  getIntegrationsHub,
  saveEmailFrom,
  toggleWorkspaceAutomation,
} from "@/app/actions/integrations";
import {
  AUTOMATION_TRIGGERS,
  CHANNEL_LABELS,
  INTEGRATION_CATALOG,
  TRIGGER_LABELS,
  type IntegrationKind,
} from "@/lib/integrations/catalog";
import type {
  WorkspaceAutomation,
  WorkspaceIntegration,
} from "@/types/integrations";

const STATUS_LABEL: Record<string, string> = {
  connected: "Ligado",
  pending: "Aguardando",
  disabled: "Desligado",
};

export function IntegrationsWorkspace(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<WorkspaceIntegration[]>([]);
  const [automations, setAutomations] = useState<WorkspaceAutomation[]>([]);
  const [emailReady, setEmailReady] = useState(false);
  const [drive, setDrive] = useState({
    configured: false,
    connected: false,
    accountEmail: null as string | null,
  });
  const [googleLogin, setGoogleLogin] = useState(false);

  const [newKind, setNewKind] = useState<IntegrationKind>("webhook");
  const [newName, setNewName] = useState("");
  const [newFrom, setNewFrom] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newWebhook, setNewWebhook] = useState("");
  const [emailFrom, setEmailFrom] = useState("");

  const [autoName, setAutoName] = useState("");
  const [autoTrigger, setAutoTrigger] =
    useState<(typeof AUTOMATION_TRIGGERS)[number]>("prazo");
  const [autoChannel, setAutoChannel] = useState<"email" | "webhook">("email");
  const [autoWebhook, setAutoWebhook] = useState("");

  async function refresh(): Promise<void> {
    setLoading(true);
    const result = await getIntegrationsHub();
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setIntegrations(result.data.integrations);
    setAutomations(result.data.automations);
    setEmailReady(result.data.emailReady);
    setDrive(result.data.drive);
    setGoogleLogin(result.data.googleLogin);
    const email = result.data.integrations.find(
      (item) => item.kind === "email",
    );
    if (email?.config.from) setEmailFrom(email.config.from);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh carrega o hub na montagem
    void refresh();
  }, []);

  const creatable = INTEGRATION_CATALOG.filter((item) => item.canCreate);

  async function handleCreateIntegration(): Promise<void> {
    const result = await createWorkspaceIntegration({
      kind: newKind,
      name: newName || undefined,
      from: newFrom || undefined,
      phone: newPhone || undefined,
      webhookUrl: newWebhook || undefined,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Integração criada.");
    setNewName("");
    setNewFrom("");
    setNewPhone("");
    setNewWebhook("");
    void refresh();
  }

  async function handleSaveFrom(): Promise<void> {
    if (!emailFrom.trim()) return;
    const result = await saveEmailFrom(emailFrom);
    if (!result.success) toast.error(result.error);
    else {
      toast.success("Remetente salvo. Dá para trocar o domínio depois.");
      void refresh();
    }
  }

  async function handleCreateAutomation(): Promise<void> {
    const result = await createWorkspaceAutomation({
      name: autoName,
      trigger: autoTrigger,
      channel: autoChannel,
      webhookUrl: autoWebhook || undefined,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Automação criada.");
    setAutoName("");
    setAutoWebhook("");
    void refresh();
  }

  if (loading) {
    return (
      <p className="flex items-center text-sm text-text-2">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando integrações…
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Conectores</h2>
        <p className="text-sm text-text-2">
          E-mail e Drive já enviam de verdade. WhatsApp, Agenda e Notion você
          cria agora para reservar o lugar; o envio desses entra na sequência.
        </p>
        <ul className="space-y-2">
          <li className="rounded-lg border border-border bg-surface-1 p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">E-mail</p>
                <p className="text-sm text-text-2">
                  Pode começar hoje sem domínio próprio. Depois você troca para
                  @landgrow.com.br.
                </p>
              </div>
              <Badge variant="outline">
                {emailReady ? "Resend pronto" : "Falta RESEND_API_KEY"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="max-w-md"
                placeholder="PULSO <beth.t@example.com>"
                value={emailFrom}
                onChange={(e) => setEmailFrom(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSaveFrom()}
              >
                Salvar remetente
              </Button>
            </div>
            <p className="text-xs text-text-2">
              Sem domínio: use o endereço de teste do Resend. Com domínio
              verificado no Resend, coloque noreply@seudominio.
            </p>
          </li>

          <li className="rounded-lg border border-border bg-surface-1 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Google Drive</p>
              <p className="text-sm text-text-2">
                Pasta PULSO no Drive da Land Grow e arquivos dos cards.
              </p>
            </div>
            <DriveConnect
              configured={drive.configured}
              connected={drive.connected}
              accountEmail={drive.accountEmail}
            />
          </li>

          <li className="rounded-lg border border-border bg-surface-1 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Login Google</p>
              <p className="text-sm text-text-2">
                Só para entrar no PULSO. Não é o Drive.
              </p>
            </div>
            <GoogleConnectButton connected={googleLogin} />
          </li>

          {integrations
            .filter(
              (item) => !["email", "drive", "google_login"].includes(item.kind),
            )
            .map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-surface-1 p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-sm text-text-2">
                    {
                      INTEGRATION_CATALOG.find((c) => c.kind === item.kind)
                        ?.detail
                    }
                    {item.config.phone ? ` · ${item.config.phone}` : ""}
                    {item.config.webhookUrl
                      ? ` · ${item.config.webhookUrl}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{STATUS_LABEL[item.status]}</Badge>
                  <button
                    type="button"
                    aria-label="Remover"
                    onClick={() => {
                      void deleteWorkspaceIntegration(item.id).then(
                        (result) => {
                          if (!result.success) toast.error(result.error);
                          else void refresh();
                        },
                      );
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-text-2 hover:text-error" />
                  </button>
                </div>
              </li>
            ))}
        </ul>

        <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
          <p className="text-sm font-medium">Nova integração</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as IntegrationKind)}
            >
              {creatable.map((item) => (
                <option key={item.kind} value={item.kind}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Nome (opcional)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            {newKind === "email" ? (
              <Input
                placeholder="Remetente"
                value={newFrom}
                onChange={(e) => setNewFrom(e.target.value)}
              />
            ) : null}
            {newKind === "whatsapp" ? (
              <Input
                placeholder="Número com DDI"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            ) : null}
            {newKind === "webhook" ? (
              <Input
                placeholder="https://…"
                value={newWebhook}
                onChange={(e) => setNewWebhook(e.target.value)}
              />
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleCreateIntegration()}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Criar integração
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Automações</h2>
        <p className="text-sm text-text-2">
          Quando o evento acontece, o PULSO manda e-mail ou chama um webhook.
          Desligue o que não quiser.
        </p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {automations.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) => {
                  void toggleWorkspaceAutomation(
                    item.id,
                    e.target.checked,
                  ).then((result) => {
                    if (!result.success) toast.error(result.error);
                    else void refresh();
                  });
                }}
              />
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{item.name}</span>
                <span className="text-text-2">
                  {" "}
                  · {TRIGGER_LABELS[item.trigger]} →{" "}
                  {CHANNEL_LABELS[item.channel]}
                </span>
              </p>
              <button
                type="button"
                aria-label="Excluir automação"
                onClick={() => {
                  void deleteWorkspaceAutomation(item.id).then((result) => {
                    if (!result.success) toast.error(result.error);
                    else void refresh();
                  });
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-text-2 hover:text-error" />
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
          <p className="text-sm font-medium">Nova automação</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Nome da automação"
              value={autoName}
              onChange={(e) => setAutoName(e.target.value)}
            />
            <Select
              value={autoTrigger}
              onChange={(e) =>
                setAutoTrigger(
                  e.target.value as (typeof AUTOMATION_TRIGGERS)[number],
                )
              }
            >
              {AUTOMATION_TRIGGERS.map((trigger) => (
                <option key={trigger} value={trigger}>
                  {TRIGGER_LABELS[trigger]}
                </option>
              ))}
            </Select>
            <Select
              value={autoChannel}
              onChange={(e) =>
                setAutoChannel(e.target.value as "email" | "webhook")
              }
            >
              <option value="email">E-mail</option>
              <option value="webhook">Webhook</option>
            </Select>
            {autoChannel === "webhook" ? (
              <Input
                placeholder="URL do webhook"
                value={autoWebhook}
                onChange={(e) => setAutoWebhook(e.target.value)}
              />
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleCreateAutomation()}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Criar automação
          </Button>
        </div>
      </section>
    </div>
  );
}
