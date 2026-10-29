"use client";

import { useEffect, useState } from "react";
import { getSalaPulse } from "@/app/actions/sala-ops";
import type { SalaPulse } from "@/types/sala";

function Ring({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint: string;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center px-4 py-3">
      <div className="flex size-24 items-center justify-center rounded-full border border-border bg-surface-1">
        <p className="text-lg font-semibold text-text-1">{value}</p>
      </div>
      <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-wide text-text-3">
        {label}
      </p>
      <p className="text-center text-[11px] text-text-2">{hint}</p>
    </div>
  );
}

export function SalaPulseStrip(): JSX.Element | null {
  const [pulse, setPulse] = useState<SalaPulse | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getSalaPulse();
      if (cancelled || !result.success) return;
      setPulse(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  if (!pulse) return null;
  const conversion =
    pulse.conversionRate === null
      ? "—"
      : `${Math.round(pulse.conversionRate * 1000) / 10}%`;
  return (
    <div className="mb-4 flex flex-wrap justify-center gap-2 rounded-xl border border-border bg-surface-2/60">
      <Ring value={String(pulse.crmOpen)} label="CRM" hint="cards abertos" />
      <Ring value={conversion} label="Conversão" hint="kanban interno" />
      <Ring value={String(pulse.meetings7d)} label="Agenda" hint="7 dias" />
      <Ring value={String(pulse.due7d)} label="Prazos" hint="7 dias" />
    </div>
  );
}
