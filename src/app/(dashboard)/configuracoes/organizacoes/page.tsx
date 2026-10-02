import { redirect } from "next/navigation";
import {
  getAccessibleOrganizations,
  getActiveOrganization,
} from "@/lib/supabase/organization-server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Check } from "lucide-react";

const CLIENT_ROLES = new Set([
  "client_owner",
  "client_member",
  "client_viewer",
]);

export default async function OrganizacoesPage(): Promise<JSX.Element> {
  const allOrgs = await getAccessibleOrganizations();
  const active = await getActiveOrganization();

  // platform_admin/consultant enxergam TODAS as orgs do sistema aqui (mesma
  // função usada pelo org-switcher) — isso não é "minhas empresas", é visão
  // de admin, que já tem lugar próprio em /admin/clientes. Sem organização
  // própria de verdade, manda direto pra lá em vez de duplicar a lista.
  const orgs = allOrgs.filter((o) => CLIENT_ROLES.has(o.my_role));
  const isAdminOrConsultant = allOrgs.some(
    (o) => o.my_role === "platform_admin" || o.my_role === "consultant",
  );

  if (isAdminOrConsultant && orgs.length === 0) {
    redirect("/admin/clientes");
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Organizações</h1>
        <p className="text-text-2">
          Gerencie as empresas que você tem acesso na plataforma.
        </p>
      </div>

      {/* Lista de orgs */}
      <div className="space-y-3">
        {orgs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-text-2 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhuma organização
              </h3>
              <p className="text-text-2 text-sm mb-4">
                Você ainda não tem acesso a nenhuma empresa. Peça para um
                administrador da Land Grow liberar seu acesso.
              </p>
            </CardContent>
          </Card>
        ) : (
          orgs.map((org) => {
            const isActive = active?.org.id === org.id;
            return (
              <Card key={org.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        {isActive && (
                          <Badge
                            variant="default"
                            className="bg-primary/10 text-primary"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Ativa
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        Slug: <code className="text-xs">{org.slug}</code>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
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
                  </div>
                </CardHeader>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
