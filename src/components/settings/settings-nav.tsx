"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getMyPlatformRole } from "@/app/actions/me";
import { visibleSettingsNav } from "@/lib/settings/nav";
import { CollapsibleSubnav } from "@/components/layout/nav-collapse";

export function SettingsNav(): JSX.Element {
  const pathname = usePathname();
  const [isStaff, setIsStaff] = useState(false);
  const [canAudit, setCanAudit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { role, capabilities } = await getMyPlatformRole();
      if (cancelled) return;
      setIsStaff(role !== null);
      setCanAudit(capabilities.includes("audit_log"));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = visibleSettingsNav({ isStaff, canAudit });

  return (
    <CollapsibleSubnav storageKey="pulso-nav-settings">
      <nav
        aria-label="Configurações"
        className="flex h-full flex-col gap-1 overflow-y-auto border-r border-border bg-surface-1 p-2"
      >
        <Link
          href="/configuracoes"
          className={cn(
            "whitespace-nowrap rounded-md px-3 py-2 text-sm",
            pathname === "/configuracoes"
              ? "bg-primary/10 text-primary font-medium"
              : "text-text-2 hover:bg-surface-2 hover:text-text-1",
          )}
        >
          Visão geral
        </Link>
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 text-sm",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-text-2 hover:bg-surface-2 hover:text-text-1",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </CollapsibleSubnav>
  );
}
