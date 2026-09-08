import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardColetaTipoProps {
  icon: LucideIcon;
  label: string;
  primaryStat: string;
  secondaryStat?: string;
  href?: string;
  disabledNote?: string;
}

export function CardColetaTipo({
  icon: Icon,
  label,
  primaryStat,
  secondaryStat,
  href,
  disabledNote,
}: CardColetaTipoProps) {
  const content = (
    <div
      className={cn(
        "flex h-full flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
        href ? "hover:border-primary/50 hover:bg-muted/50" : "opacity-60",
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {label}
      </div>
      <p className="text-2xl font-bold">{primaryStat}</p>
      <p className="text-xs text-muted-foreground">
        {disabledNote ?? secondaryStat ?? " "}
      </p>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
