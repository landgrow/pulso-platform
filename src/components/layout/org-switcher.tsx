"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { setActiveOrganization } from "@/app/actions/organization";
import type { AccessibleOrganization } from "@/types/organization";

const CLIENT_ROLES = new Set([
  "client_owner",
  "client_member",
  "client_viewer",
]);

export function OrgSwitcher(): JSX.Element {
  const [orgs, setOrgs] = useState<AccessibleOrganization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChanging, setIsChanging] = useState(false);
  const router = useRouter();

  // Carrega orgs acessíveis via browser client (RPC)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("my_accessible_orgs");
      if (cancelled) return;
      const list = (data ?? []) as AccessibleOrganization[];
      setOrgs(list);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // platform_admin/consultant enxergam TODAS as orgs via my_accessible_orgs —
  // isso não é "onde eu tenho conta pessoal", é visão de admin. Separamos:
  // só vira opção de troca de organização quem é vínculo real (client_*).
  const clientOrgs = orgs.filter((o) => CLIENT_ROLES.has(o.my_role));
  const isAdminOrConsultant = orgs.some(
    (o) => o.my_role === "platform_admin" || o.my_role === "consultant",
  );

  const activeOrg =
    clientOrgs.find((o) => o.id === activeOrgId) ?? clientOrgs[0];

  const handleSwitch = async (orgId: string): Promise<void> => {
    setIsChanging(true);
    try {
      await setActiveOrganization(orgId);
      setActiveOrgId(orgId);
      router.refresh();
    } finally {
      setIsChanging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-text-2" />
      </div>
    );
  }

  // platform_admin/consultant sem organização própria: não faz sentido
  // mostrar um seletor de "qual empresa eu sou" — é um link pra área admin.
  if (isAdminOrConsultant && clientOrgs.length === 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/admin/clientes")}
        className="gap-2"
      >
        <ShieldCheck className="h-4 w-4 text-primary" />
        Administração
      </Button>
    );
  }

  if (!activeOrg) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/configuracoes/organizacoes")}
        className="gap-2"
      >
        <Building2 className="h-4 w-4" />
        Organizações
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 h-auto py-2 text-sm font-medium hover:bg-surface-2"
        >
          <Building2 className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline max-w-[160px] truncate">
            {activeOrg.name}
          </span>
          <ChevronDown className="h-3 w-3 text-text-2" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-text-2 font-normal">
          Organizações
        </DropdownMenuLabel>

        {clientOrgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => void handleSwitch(org.id)}
            disabled={isChanging}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col min-w-0">
              <span className={org.id === activeOrgId ? "font-semibold" : ""}>
                {org.name}
              </span>
              <span className="text-xs text-text-2 capitalize">
                {org.my_role === "client_owner"
                  ? "Proprietário"
                  : org.my_role === "client_member"
                    ? "Membro"
                    : org.my_role === "client_viewer"
                      ? "Visualizador"
                      : org.my_role}
              </span>
            </div>
            {org.id === activeOrgId && (
              <span className="text-xs text-primary font-medium ml-2">
                Ativo
              </span>
            )}
            {isChanging && org.id === activeOrgId && (
              <Loader2 className="h-3 w-3 animate-spin ml-2" />
            )}
          </DropdownMenuItem>
        ))}

        {isAdminOrConsultant && (
          <DropdownMenuItem
            onClick={() => router.push("/admin/clientes")}
            className="cursor-pointer text-primary"
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            Ver todos os clientes (admin)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
