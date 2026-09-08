import { Lock, CircleCheck, CircleDashed, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PeriodoStatus } from "@/types/collections";

interface StatusConfig {
  label: string;
  icon: typeof Lock;
  className: string;
}

const STATUS_CONFIG: Record<PeriodoStatus, StatusConfig> = {
  em_coleta: {
    label: "Em coleta",
    icon: CircleDashed,
    className: "border-transparent bg-warning/15 text-warning",
  },
  pronto_para_analise: {
    label: "Pronto p/ análise",
    icon: CircleDot,
    className: "border-transparent bg-info/15 text-info",
  },
  analisado: {
    label: "Analisado",
    icon: CircleCheck,
    className: "border-transparent bg-success/15 text-success",
  },
  fechado: {
    label: "Fechado",
    icon: Lock,
    className: "border-transparent bg-surface-2 text-text-2",
  },
};

interface StatusBadgeProps {
  status: PeriodoStatus;
  closedAt?: string | null;
}

export function StatusBadge({ status, closedAt }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${config.className}`}>
      <Icon className="size-3" aria-hidden="true" />
      {config.label}
      {status === "fechado" && closedAt && (
        <span className="ml-1 opacity-70">
          em {new Date(closedAt).toLocaleDateString("pt-BR")}
        </span>
      )}
    </Badge>
  );
}
