"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { saveNotificationPrefs } from "@/app/actions/settings";
import type { NotificationPrefs } from "@/lib/settings/notifications";

const ROWS: {
  key: keyof NotificationPrefs;
  label: string;
  hint: string;
  staffOnly?: boolean;
}[] = [
  {
    key: "prazo",
    label: "Prazo de tarefa",
    hint: "Card seu atrasado, vence hoje ou nos próximos 2 dias.",
  },
  {
    key: "comentario",
    label: "Comentário no card",
    hint: "Quando alguém comentar num card da sua org ou atribuído a você.",
  },
  {
    key: "arquivo",
    label: "Arquivo no card",
    hint: "Quando anexarem um arquivo ou um link do Drive.",
  },
  {
    key: "reuniao",
    label: "Reunião",
    hint: "Lembrete das reuniões registradas em Atividades.",
  },
  {
    key: "cardCliente",
    label: "Cliente criou ou atualizou card",
    hint: "Equipe Land Grow: o cliente mexeu no Plano de Ação.",
    staffOnly: true,
  },
  {
    key: "clienteAtraso",
    label: "Cliente atrasou tarefa",
    hint: "Equipe Land Grow: prazo do cliente passou.",
    staffOnly: true,
  },
  {
    key: "conviteEquipe",
    label: "Convite de acesso",
    hint: "O Supabase manda o e-mail de convite e senha.",
  },
  {
    key: "resumoDiario",
    label: "Resumo do dia",
    hint: "Um e-mail às 8h com o que venceu e o que está aberto.",
  },
];

export function NotificationPrefsForm({
  initial,
  isStaff,
}: {
  initial: NotificationPrefs;
  isStaff: boolean;
}): JSX.Element {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    const result = await saveNotificationPrefs(prefs);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Preferências salvas.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <ul className="space-y-4">
        {ROWS.filter((row) => !row.staffOnly || isStaff).map((row) => (
          <li key={row.key} className="flex items-start gap-3">
            <Checkbox
              id={row.key}
              checked={prefs[row.key]}
              onCheckedChange={(value) =>
                setPrefs((current) => ({
                  ...current,
                  [row.key]: value === true,
                }))
              }
              className="mt-1"
            />
            <label htmlFor={row.key} className="cursor-pointer">
              <p className="text-sm font-medium text-text-1">{row.label}</p>
              <p className="text-sm text-text-2">{row.hint}</p>
            </label>
          </li>
        ))}
      </ul>
      <p className="text-xs text-text-2">
        Comentário, arquivo e card do cliente saem na hora. Prazo e atraso do
        cliente saem no cron diário às 8h (Brasília). Convite continua vindo do
        Supabase.
      </p>
      <Button type="submit" disabled={saving}>
        Salvar preferências
      </Button>
    </form>
  );
}
