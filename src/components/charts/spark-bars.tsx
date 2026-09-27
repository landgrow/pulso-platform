import { cn } from "@/lib/utils";

/** Mini barras estilo Stats Bento (21st) — sem sombra, sem Framer. */
export function SparkBars({
  values,
  className,
  tone = "neutral",
}: {
  values: number[];
  className?: string;
  tone?: "neutral" | "signed";
}): JSX.Element {
  const max = Math.max(1, ...values.map((value) => Math.abs(value)));
  return (
    <div className={cn("flex h-8 items-end gap-0.5", className)} aria-hidden>
      {values.map((value, index) => {
        const height = Math.max(12, (Math.abs(value) / max) * 100);
        const signedNegative = tone === "signed" && value < 0;
        return (
          <div
            key={index}
            className={cn(
              "w-1.5 rounded-full",
              signedNegative ? "bg-negative" : "bg-text-1/70",
            )}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
}
