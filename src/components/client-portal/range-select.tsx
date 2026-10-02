"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PERIOD_RANGE_OPTIONS, type PeriodRangeKey } from "./range-options";

export function RangeSelect({ value }: { value: PeriodRangeKey }): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm text-text-2">
      <span className="sr-only">Recorte</span>
      <select
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("periodo", e.target.value);
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        className="h-9 rounded-md border border-border bg-surface-1 px-3 text-sm text-text-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {PERIOD_RANGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
