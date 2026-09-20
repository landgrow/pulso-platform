import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChartFrame({
  eyebrow,
  title,
  hint,
  action,
  children,
  className,
}: {
  eyebrow?: string | undefined;
  title: string;
  hint?: string | undefined;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-surface-1 p-5",
        className,
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-3">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-sm font-semibold text-text-1">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs text-text-3">{hint}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function ChartLegend({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}): JSX.Element {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-1.5 text-[11px] text-text-2"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function ChartEmpty({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex h-56 items-center justify-center text-sm text-text-2">
      {children}
    </div>
  );
}
