"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { assignConsultantOrg, unassignConsultantOrg } from "@/app/actions/team";
import { toast } from "sonner";
import { Loader2, Settings2 } from "lucide-react";

interface OrgOption {
  id: string;
  name: string;
}

export function ManageConsultantOrgs({
  consultantId,
  allOrgs,
  assignedOrgIds,
}: {
  consultantId: string;
  allOrgs: OrgOption[];
  assignedOrgIds: string[];
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [loadingOrgId, setLoadingOrgId] = useState<string | null>(null);
  const router = useRouter();
  const assignedSet = new Set(assignedOrgIds);

  const toggle = async (orgId: string, isAssigned: boolean): Promise<void> => {
    setLoadingOrgId(orgId);
    try {
      const result = isAssigned
        ? await unassignConsultantOrg(consultantId, orgId)
        : await assignConsultantOrg(consultantId, orgId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar atribuição.");
    } finally {
      setLoadingOrgId(null);
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
        <Settings2 className="mr-1.5 h-3.5 w-3.5" />
        Gerenciar clientes
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-1 p-3 space-y-1.5 min-w-[220px]">
      {allOrgs.length === 0 ? (
        <p className="text-xs text-text-2">Nenhum cliente cadastrado ainda.</p>
      ) : (
        allOrgs.map((org) => {
          const isAssigned = assignedSet.has(org.id);
          const isLoading = loadingOrgId === org.id;
          return (
            <label
              key={org.id}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={isAssigned}
                disabled={isLoading}
                onChange={() => void toggle(org.id, isAssigned)}
                className="h-3.5 w-3.5 rounded border-border"
              />
              <span className="flex-1 truncate">{org.name}</span>
              {isLoading && (
                <Loader2 className="h-3 w-3 animate-spin text-text-2" />
              )}
            </label>
          );
        })
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full mt-1"
        onClick={() => setOpen(false)}
      >
        Fechar
      </Button>
    </div>
  );
}
