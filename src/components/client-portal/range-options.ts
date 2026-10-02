export type PeriodRangeKey = "7d" | "30d" | "90d" | "12m" | "ano";

export const PERIOD_RANGE_OPTIONS: { value: PeriodRangeKey; label: string }[] =
  [
    { value: "7d", label: "Últimos 7 dias" },
    { value: "30d", label: "Últimos 30 dias" },
    { value: "90d", label: "Últimos 90 dias" },
    { value: "12m", label: "Últimos 12 meses" },
    { value: "ano", label: "Este ano" },
  ];
