"use client";

import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AutoSaveStatus } from "@/hooks/use-auto-save";

const CONFIG: Record<
  AutoSaveStatus,
  { label: string; className: string; Icon: typeof Check }
> = {
  idle: {
    label: "",
    className: "text-muted-foreground/0",
    Icon: Check,
  },
  dirty: {
    label: "Alterações pendentes",
    className: "text-yellow-600",
    Icon: Loader2,
  },
  saving: {
    label: "Salvando...",
    className: "text-muted-foreground animate-pulse",
    Icon: Loader2,
  },
  saved: {
    label: "Salvo",
    className: "text-green-600",
    Icon: Check,
  },
  error: {
    label: "Erro ao salvar",
    className: "text-destructive",
    Icon: AlertCircle,
  },
};

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  className?: string;
}

export function AutoSaveIndicator({
  status,
  className,
}: AutoSaveIndicatorProps) {
  const { label, className: colorClass, Icon } = CONFIG[status];
  if (status === "idle") return null;

  const isSpinning = status === "saving" || status === "dirty";

  return (
    <div
      className={cn("flex items-center gap-1.5 text-xs", colorClass, className)}
    >
      <Icon
        className={cn("size-3.5", isSpinning && "animate-spin")}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
