"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setConsultantCapability } from "@/app/actions/team";
import { AccessPlacesField } from "@/components/equipe/access-places-field";
import type { StaffCapabilityId } from "@/lib/auth/staff-access";

export function ManageConsultantFunctions({
  consultantId,
  granted,
}: {
  consultantId: string;
  granted: StaffCapabilityId[];
}): JSX.Element {
  const [loadingCap, setLoadingCap] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    capability: StaffCapabilityId;
    next: boolean;
  } | null>(null);
  const router = useRouter();

  const localGranted = pending
    ? pending.next
      ? [...new Set([...granted, pending.capability])]
      : granted.filter((id) => id !== pending.capability)
    : granted;

  const toggle = async (
    capability: StaffCapabilityId,
    next: boolean,
  ): Promise<void> => {
    setPending({ capability, next });
    setLoadingCap(capability);
    try {
      const result = await setConsultantCapability(
        consultantId,
        capability,
        next,
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar o acesso.");
    } finally {
      setPending(null);
      setLoadingCap(null);
    }
  };

  return (
    <AccessPlacesField
      granted={localGranted}
      loadingId={loadingCap}
      onToggle={(capability, next) => void toggle(capability, next)}
    />
  );
}
