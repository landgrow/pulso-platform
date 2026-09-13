import type { ReactNode } from "react";

/** Mesmo bloco "Em construção" do protótipo (renderPlaceholder) — usado pelos módulos que ainda não têm desenho próprio. */
export function PlaceholderModule({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <div className="h-14 w-14 rounded-full bg-surface-2 flex items-center justify-center text-text-2">
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-text-2 max-w-sm">{description}</p>
      <p className="text-xs text-text-2">
        Em construção. Ainda sem desenho definido.
      </p>
    </div>
  );
}
