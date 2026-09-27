"use client";

import { useEffect, useState } from "react";
import { returnToLandGrowHq } from "@/app/actions/hq";
import { getMyPlatformRole } from "@/app/actions/me";
import { Button } from "@/components/ui/button";

export function ClientWorkspaceBanner(): JSX.Element | null {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { role, inClientWorkspace } = await getMyPlatformRole();
      if (!cancelled) setShow(role !== null && inClientWorkspace);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

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
