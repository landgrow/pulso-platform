"use client";

import { formatCurrency } from "@/lib/utils";

type PayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
  fill?: string;
  dataKey?: string | number;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string | number;
};

export function ChartTooltip({
  active,
  payload,
  label,
}: ChartTooltipProps): JSX.Element | null {
  if (!active || !payload?.length) return null;
  const items = payload as PayloadItem[];

  return (
    <div className="min-w-[10rem] rounded-lg border border-border bg-surface-1 px-3 py-2 shadow-[0_12px_32px_rgba(10,15,30,0.14)]">
      {label ? (
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
          {label}
        </p>
      ) : null}
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={String(item.dataKey ?? item.name)}
            className="flex items-center justify-between gap-6 text-xs"
          >
            <span className="flex items-center gap-1.5 text-text-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: item.color ?? item.fill }}
              />
              {item.name}
            </span>
            <span className="tabular-nums text-text-1">
              {typeof item.value === "number"
                ? formatCurrency(item.value)
                : (item.value ?? "—")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CountTooltip({
  active,
  payload,
  label,
}: ChartTooltipProps): JSX.Element | null {
  if (!active || !payload?.length) return null;
  const items = payload as PayloadItem[];

  return (
    <div className="rounded-lg border border-border bg-surface-1 px-3 py-2 shadow-[0_12px_32px_rgba(10,15,30,0.14)]">
      {label ? (
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3">
          {label}
        </p>
      ) : null}
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={String(item.dataKey ?? item.name)}
            className="flex items-center justify-between gap-6 text-xs"
          >
            <span className="flex items-center gap-1.5 text-text-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: item.color ?? item.fill }}
              />
              {item.name}
            </span>
            <span className="tabular-nums text-text-1">{item.value ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
