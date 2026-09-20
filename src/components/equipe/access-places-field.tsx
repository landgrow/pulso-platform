"use client";

import { Loader2 } from "lucide-react";
import {
  STAFF_CAPABILITIES,
  STAFF_CAPABILITY_GROUPS,
  type StaffCapabilityId,
} from "@/lib/auth/staff-access";
import { cn } from "@/lib/utils";

export function AccessPlacesField({
  granted,
  disabled,
  loadingId,
  onToggle,
}: {
  granted: readonly string[];
  disabled?: boolean;
  loadingId?: string | null;
  onToggle: (capability: StaffCapabilityId, next: boolean) => void;
}): JSX.Element {
  const grantedSet = new Set(granted);

  return (
    <fieldset className="space-y-3 rounded-lg border border-border bg-surface-1 p-4">
      <legend className="px-1 text-sm font-semibold text-text-1">
        Lugares que pode acessar
      </legend>
      <p className="text-xs text-text-2">
        Marque cada aba do sistema. O que não estiver marcado some do menu dessa
        pessoa.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {STAFF_CAPABILITY_GROUPS.map((group) => (
          <div key={group.id} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
              {group.label}
            </p>
            <ul className="space-y-1.5">
              {STAFF_CAPABILITIES.filter((cap) => cap.group === group.id).map(
                (cap) => {
                  const isOn = grantedSet.has(cap.id);
                  const isLoading = loadingId === cap.id;
                  return (
                    <li key={cap.id}>
                      <label
                        className={cn(
                          "flex items-center gap-2 text-sm",
                          disabled
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isOn}
                          disabled={disabled || isLoading}
                          onChange={() => onToggle(cap.id, !isOn)}
                          className="h-4 w-4 rounded border-border"
                        />
                        <span className="flex-1">{cap.label}</span>
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin text-text-2" />
                        ) : null}
                      </label>
                    </li>
                  );
                },
              )}
            </ul>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
