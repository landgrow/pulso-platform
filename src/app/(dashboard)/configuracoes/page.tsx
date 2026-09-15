import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getPlatformRole,
  getStaffCapabilities,
} from "@/lib/supabase/platform-role-server";
import { visibleSettingsNav } from "@/lib/settings/nav";

export default async function ConfiguracoesPage(): Promise<JSX.Element> {
  const supabase = await createClient();
  const [role, caps] = await Promise.all([
    getPlatformRole(supabase),
    getStaffCapabilities(supabase),
  ]);
  const items = visibleSettingsNav({
    isStaff: role !== null,
    canAudit: caps.includes("audit_log"),
  });

  const groups = [
    { id: "conta", title: "Sua conta" },
    { id: "trabalho", title: "Trabalho" },
    { id: "privacidade", title: "Privacidade" },
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-text-2">
          Conta, aparência, avisos e segurança. Clientes e equipe continuam nos
          menus Organizações e Equipe — daqui não se gerencia carteira.
        </p>
      </div>

      {groups.map((group) => {
        const groupItems = items.filter((item) => item.group === group.id);
        if (groupItems.length === 0) return null;
        return (
          <section key={group.id} className="space-y-3">
            <h2 className="text-sm font-medium text-text-2">{group.title}</h2>
            <div className="grid gap-2">
              {groupItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-4 rounded-lg border border-border bg-surface-1 p-4 hover:border-primary/40 hover:bg-surface-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-1">
                      {item.label}
                    </p>
                    <p className="text-sm text-text-2">{item.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-2 shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
