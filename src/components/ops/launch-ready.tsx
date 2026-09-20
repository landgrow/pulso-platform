"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getLaunchReadiness } from "@/app/actions/notify";
import { RunNotificationsButton } from "@/components/settings/operacao-actions";

interface LaunchStatus {
  cronSecret: boolean;
  resend: boolean;
  fromEmail: boolean;
}

export function LaunchReadyCard(): JSX.Element {
  const [status, setStatus] = useState<LaunchStatus | null>(null);

  useEffect(() => {
    void getLaunchReadiness().then((result) => {
      if (!result.success) toast.error(result.error);
      else setStatus(result.data);
    });
  }, []);

  return (
    <section className="rounded-lg border border-border bg-surface-1 p-5 space-y-4">
      <header>
        <h2 className="text-sm font-semibold">Avisos e cron</h2>
        <p className="text-sm text-text-2 mt-1">
          Ambiente de e-mail e job de prazos. Não fica na home — só aqui na
          operação.
        </p>
      </header>

      {status == null ? (
        <p className="flex items-center text-sm text-text-2">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Conferindo ambiente...
        </p>
      ) : (
        <ul className="grid sm:grid-cols-3 gap-2 text-sm">
          <ReadyFlag
            ok={status.cronSecret}
            label="CRON_SECRET"
            hint={status.cronSecret ? "Job autenticado" : "Falta no ambiente"}
          />
          <ReadyFlag
            ok={status.resend}
            label="RESEND_API_KEY"
            hint={status.resend ? "E-mail pode sair" : "Job roda sem enviar"}
          />
          <ReadyFlag
            ok={status.fromEmail}
            label="NOTIFY_FROM_EMAIL"
            hint={
              status.fromEmail ? "Remetente definido" : "Usa o padrão do Resend"
            }
          />
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <RunNotificationsButton />
        <Link
          href="/configuracoes/operacao"
          className="text-xs text-primary hover:underline"
        >
          Operação
        </Link>
        <Link
          href="/configuracoes/notificacoes"
          className="text-xs text-primary hover:underline"
        >
          Preferências de aviso
        </Link>
      </div>
    </section>
  );
}

function ReadyFlag({
  ok,
  label,
  hint,
}: {
  ok: boolean;
  label: string;
  hint: string;
}): JSX.Element {
  return (
    <li className="rounded-md border border-border bg-background px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-text-2">{label}</p>
      <p className="text-sm font-medium mt-0.5">{ok ? "Pronto" : "Pendente"}</p>
      <p className="text-[11px] text-text-2 mt-0.5">{hint}</p>
    </li>
  );
}
