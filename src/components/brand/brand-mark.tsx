import { cn } from "@/lib/utils";

/** Marca LG: lima sempre sobre navy — funciona no claro e no escuro. */
export function BrandMark({
  size = "sm",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-brand-navy-deep ring-1 ring-brand-lime/40",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        className,
      )}
      aria-hidden
    >
      <span
        className={cn(
          "font-bold leading-none text-brand-lime",
          size === "sm" ? "text-sm" : "text-base",
        )}
      >
        LG
      </span>
    </div>
  );
}
