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
}[] = [
  {
    key: "prazo",
    label: "Prazo de tarefa",
    hint: "Quando um card seu estiver perto do vencimento.",
  },
  {
    key: "reuniao",
    label: "Reunião",
    hint: "Lembrete das reuniões registradas em Atividades.",
  },
  {
    key: "conviteEquipe",
    label: "Convite de acesso",
    hint: "Já funciona hoje: o Supabase manda o e-mail de convite e senha.",
  },
  {
    key: "resumoDiario",
    label: "Resumo do dia",
    hint: "Um e-mail com o que venceu e o que está aberto.",
  },
];

export function NotificationPrefsForm({
  initial,
}: {
  initial: NotificationPrefs;
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
        {ROWS.map((row) => (
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
        O PULSO lê isso a cada hora. Prazo e reunião saem por e-mail quando a
        tarefa vence ou a reunião é hoje/amanhã. O resumo do dia sai às 8h
        (horário de Brasília). Convite de acesso continua vindo do Supabase.
      </p>
      <Button type="submit" disabled={saving}>
        Salvar preferências
      </Button>
    </form>
  );
}
