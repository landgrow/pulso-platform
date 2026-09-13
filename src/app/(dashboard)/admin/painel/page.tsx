import Link from "next/link";
import {
  ClipboardList,
  Share2,
  Radar,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { AtividadesDashboard } from "@/components/atividades/atividades-dashboard";

const QUICK_LINKS = [
  { href: "/admin/atividades", label: "Atividades", icon: ClipboardList },
  { href: "/admin/mapa-mental", label: "Mapa Mental", icon: Share2 },
  { href: "/admin/bin", label: "BIN", icon: Radar },
  { href: "/admin/min", label: "MIN", icon: Briefcase },
];

export default async function AdminPainelPage(): Promise<JSX.Element> {
  const supabase = await createClient();

  try {
    await requirePlatformAdmin(supabase);
  } catch (e) {
    return (
      <AccessDenied
        message={
          e instanceof Error
            ? e.message
            : "Apenas administradores da plataforma."
        }
      />
    );
  }

  const { data: internalOrg, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("is_internal", true)
    .single();

  if (error || !internalOrg) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
            <h1 className="text-xl font-semibold mb-2">
              Organização interna não encontrada
            </h1>
            <p className="text-text-2 text-sm">
              Rode a migration 0012_operacao_interna.sql no Supabase.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-text-2">
          Visão geral do workspace interno da Land Grow.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 p-4 hover:border-primary/40 hover:bg-surface-2 transition-colors"
          >
            <l.icon className="h-5 w-5 text-text-2" />
            <span className="text-sm font-medium">{l.label}</span>
          </Link>
        ))}
      </div>

      <AtividadesDashboard orgId={internalOrg.id} />
    </div>
  );
}
