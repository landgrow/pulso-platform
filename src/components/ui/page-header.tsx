import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text-1">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-text-2 max-w-2xl">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border bg-surface-1 px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-text-1">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-text-2 mx-auto max-w-md">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  accent = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "primary" | "lime" | "neutral";
}): JSX.Element {
  const mark =
    accent === "lime"
      ? "bg-brand-lime"
      : accent === "primary"
        ? "bg-primary"
        : "bg-border-strong";
  return (
    <div className="rounded-lg border border-border bg-surface-1 p-4">
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", mark)} />
        <p className="text-xs font-medium uppercase tracking-wide text-text-2">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-text-1">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-text-3">{hint}</p> : null}
    </div>
  );
}
