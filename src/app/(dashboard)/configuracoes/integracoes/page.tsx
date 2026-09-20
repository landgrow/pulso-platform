import { createClient } from "@/lib/supabase/server";
import { isPlatformStaff } from "@/lib/supabase/platform-role-server";
import { getSession } from "@/lib/supabase/get-session";
import { GoogleConnectButton } from "./google-connect-button";
import { IntegrationsWorkspace } from "@/components/settings/integrations-workspace";

export default async function IntegracoesPage(): Promise<JSX.Element> {
  const session = await getSession();
  const supabase = await createClient();
  const staff = await isPlatformStaff(supabase);
  const googleLogin =
    session?.user.identities?.some(
      (identity) => identity.provider === "google",
    ) ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
        <p className="text-text-2">
          {staff
            ? "Crie conectores e automações da Land Grow. E-mail e Drive já operam; os outros você cadastra aqui."
            : "O e-mail da sua conta recebe os avisos. Ligar o Google é só para entrar sem senha."}
        </p>
      </div>

      {staff ? (
        <IntegrationsWorkspace />
      ) : (
        <div className="rounded-lg border border-border bg-surface-1 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text-1">Login Google</p>
            <p className="text-sm text-text-2">
              Entrar no PULSO com a mesma conta Google, sem senha.
            </p>
          </div>
          <GoogleConnectButton connected={googleLogin} />
        </div>
      )}
    </div>
  );
}
