"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  percent: number;
  className?: string;
}

export function ProgressBar({ percent, className }: ProgressBarProps) {
  const color =
    percent >= 100
      ? "bg-green-500"
      : percent >= 60
        ? "bg-blue-500"
        : percent >= 30
          ? "bg-yellow-500"
          : "bg-muted";

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Progresso do formulário</span>
        <span className={percent >= 100 ? "text-green-600 font-medium" : ""}>
          {percent}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            color,
          )}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
