"use client";

import { returnToLandGrowHq } from "@/app/actions/hq";
import type { MeInfo } from "@/app/actions/me";
import { Button } from "@/components/ui/button";

export function ClientWorkspaceBanner({
  me,
}: {
  me: MeInfo;
}): JSX.Element | null {
  if (me.role === null || !me.inClientWorkspace) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/30 bg-primary/10 px-4 py-2 text-sm">
      <p>
        Você está no PULSO do cliente — o mesmo espaço que ele vê. O HQ da Land
        Grow (Painel, Organizações, Atividades) fica do outro lado.
      </p>
      <Button
        type="button"
        size="sm"
        onClick={() => void returnToLandGrowHq("/dashboard")}
      >
        Voltar à Land Grow
      </Button>
    </div>
  );
}
