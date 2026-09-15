import Link from "next/link";
import { Activity, Building2, ChevronRight, FileJson } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getPlatformRole,
  getStaffCapabilities,
} from "@/lib/supabase/platform-role-server";

interface SettingsItem {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export default async function ConfiguracoesPage(): Promise<JSX.Element> {
  const supabase = await createClient();
  const [role, caps] = await Promise.all([
    getPlatformRole(supabase),
    getStaffCapabilities(supabase),
  ]);
  const isStaff = role !== null;

  const items: SettingsItem[] = [
    {
      href: "/configuracoes/dados",
      title: "Meus dados",
      description: "Exportar e gerenciar seus dados pessoais (LGPD).",
      icon: FileJson,
    },
    {
      href: isStaff ? "/admin/clientes" : "/configuracoes/organizacoes",
      title: isStaff ? "Organizações" : "Minhas organizações",
      description: isStaff
        ? "Clientes e contratos da Land Grow."
        : "Empresas às quais você tem acesso.",
      icon: Building2,
    },
  ];

  if (caps.includes("audit_log")) {
    items.push({
      href: "/configuracoes/audit-log",
      title: "Histórico de ações",
      description: "Quem criou ou apagou o quê na plataforma, e quando.",
      icon: Activity,
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-text-2">
          Conta, organizações e histórico da plataforma.
        </p>
      </div>

      <div className="grid gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 rounded-lg border border-border bg-surface-1 p-4 hover:border-primary/40 hover:bg-surface-2 transition-colors"
            >
              <Icon className="h-5 w-5 text-text-2 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-1">{item.title}</p>
                <p className="text-sm text-text-2">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-2 shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
