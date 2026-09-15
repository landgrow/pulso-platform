import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/supabase/get-session";
import { GoogleConnectButton } from "./google-connect-button";

const UPCOMING = [
  {
    name: "WhatsApp",
    detail: "Avisos de prazo e reunião no WhatsApp da consultora.",
  },
  {
    name: "Google Agenda",
    detail: "Reuniões do PULSO no calendário.",
  },
  {
    name: "Notion",
    detail: "Só entra se ainda precisarmos espelhar o Plano de Ação.",
  },
  {
    name: "Open Finance",
    detail: "Extrato e invoices — por último, depois da operação no ar.",
  },
];

export default async function IntegracoesPage(): Promise<JSX.Element> {
  const session = await getSession();
  const googleConnected =
    session?.user.identities?.some(
      (identity) => identity.provider === "google",
    ) ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
        <p className="text-text-2">
          O que já liga na sua conta, e o que ainda não está no PULSO.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface-1 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text-1">Google</p>
          <p className="text-sm text-text-2">
            Entrar no PULSO com a mesma conta Google, sem senha.
          </p>
        </div>
        <GoogleConnectButton connected={googleConnected} />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-text-2">Ainda não ligam</h2>
        <ul className="grid gap-2">
          {UPCOMING.map((item) => (
            <li
              key={item.name}
              className="rounded-lg border border-border bg-surface-1 p-4 flex items-start justify-between gap-4"
            >
              <div>
                <p className="text-sm font-medium text-text-1">{item.name}</p>
                <p className="text-sm text-text-2">{item.detail}</p>
              </div>
              <Badge variant="outline">Em breve</Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
