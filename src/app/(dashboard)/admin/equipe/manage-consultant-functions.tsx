"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setConsultantCapability } from "@/app/actions/team";
import {
  STAFF_CAPABILITIES,
  type StaffCapabilityId,
} from "@/lib/auth/staff-access";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";

const GROUP_LABELS: Record<string, string> = {
  operacao: "Operação",
  financeiro: "Financeiro",
  admin: "Tarefas administrativas",
};

export function ManageConsultantFunctions({
  consultantId,
  granted,
}: {
  consultantId: string;
  granted: StaffCapabilityId[];
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [loadingCap, setLoadingCap] = useState<string | null>(null);
  const router = useRouter();
  const grantedSet = new Set(granted);

  const toggle = async (
    capability: StaffCapabilityId,
    isOn: boolean,
  ): Promise<void> => {
    setLoadingCap(capability);
    try {
      const result = await setConsultantCapability(
        consultantId,
        capability,
        !isOn,
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar função.");
    } finally {
      setLoadingCap(null);
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Shield className="mr-1.5 h-3.5 w-3.5" />
        Funções
      </Button>
    );
  }

  const groups = ["operacao", "financeiro", "admin"] as const;

  return (
    <div className="rounded-lg border border-border bg-surface-1 p-3 space-y-3 min-w-[260px]">
      {groups.map((group) => (
        <div key={group} className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-2">
            {GROUP_LABELS[group]}
          </p>
          {STAFF_CAPABILITIES.filter((c) => c.group === group).map((cap) => {
            const isOn = grantedSet.has(cap.id);
            const isLoading = loadingCap === cap.id;
            return (
              <label
                key={cap.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  disabled={isLoading}
                  onChange={() => void toggle(cap.id, isOn)}
                  className="h-3.5 w-3.5 rounded border-border"
                />
                <span className="flex-1 truncate">{cap.label}</span>
                {isLoading && (
                  <Loader2 className="h-3 w-3 animate-spin text-text-2" />
                )}
              </label>
            );
          })}
        </div>
      ))}
      <p className="text-[11px] text-text-2 leading-snug">
        Cards no kanban “Tarefas administrativas” nunca aparecem para o
        consultor, mesmo com Atividades ligada.
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() => setOpen(false)}
      >
        Fechar
      </Button>
    </div>
  );
}
