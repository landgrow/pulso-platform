"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** Volta para a lista de Configurações — só nas subpáginas. */
export function SettingsBackLink(): JSX.Element | null {
  const pathname = usePathname();
  if (pathname === "/configuracoes") return null;
  return (
    <Link
      href="/configuracoes"
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Configurações
    </Link>
  );
}
