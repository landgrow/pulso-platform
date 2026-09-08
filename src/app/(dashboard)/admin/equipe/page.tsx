import { AlertCircle, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listTeamMembers } from "@/app/actions/team";
import { listClientDirectory } from "@/app/actions/clientes";
import { AddPlatformTeamMemberForm } from "./add-team-member-form";
import { RemovePlatformTeamMemberButton } from "./remove-team-member-button";
import { ManageConsultantOrgs } from "./manage-consultant-orgs";

export default async function EquipePage(): Promise<JSX.Element> {
  const [teamResult, clientesResult] = await Promise.all([
    listTeamMembers(),
    listClientDirectory(),
  ]);

  if (!teamResult.success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
            <h1 className="text-xl font-semibold mb-2">Acesso negado</h1>
            <p className="text-text-2 text-sm">{teamResult.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const members = teamResult.data;
  const allOrgs = clientesResult.success
    ? clientesResult.data.map((c) => ({ id: c.org_id, name: c.name }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
          <Badge variant="outline" className="text-text-2">
            admin only
          </Badge>
        </div>
        <p className="text-text-2">
          Quem tem acesso administrativo ao PULSO. Admin vê e mexe em tudo;
          consultor só enxerga os clientes atribuídos a ele.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Adicionar à equipe</CardTitle>
          <CardDescription>
            Convite igual ao de Acessos — a pessoa define a própria senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddPlatformTeamMemberForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-text-2 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Ninguém na equipe ainda
              </h3>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.fullName ?? m.email}
                    </p>
                    <p className="text-xs text-text-2 truncate">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant={
                        m.role === "platform_admin" ? "success" : "outline"
                      }
                    >
                      {m.role === "platform_admin" ? "Admin" : "Consultor"}
                    </Badge>
                    {m.role === "consultant" && (
                      <>
                        <div className="hidden md:flex flex-wrap gap-1 max-w-[240px]">
                          {m.assignedOrgs.length === 0 ? (
                            <span className="text-xs text-text-2">
                              nenhum cliente
                            </span>
                          ) : (
                            m.assignedOrgs.map((o) => (
                              <Badge
                                key={o.org_id}
                                variant="outline"
                                className="text-xs"
                              >
                                {o.org_name}
                              </Badge>
                            ))
                          )}
                        </div>
                        <ManageConsultantOrgs
                          consultantId={m.userId}
                          allOrgs={allOrgs}
                          assignedOrgIds={m.assignedOrgs.map((o) => o.org_id)}
                        />
                      </>
                    )}
                    <RemovePlatformTeamMemberButton
                      userId={m.userId}
                      email={m.email}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
