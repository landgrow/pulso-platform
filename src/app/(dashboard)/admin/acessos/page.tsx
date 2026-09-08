import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getIsPlatformAdmin } from "@/app/actions/admin";
import { CreateClientAccountForm } from "./create-client-account-form";

export default async function AcessosPage(): Promise<JSX.Element> {
  const { isAdmin } = await getIsPlatformAdmin();

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
            <h1 className="text-xl font-semibold mb-2">Acesso negado</h1>
            <p className="text-text-2 text-sm">
              Esta página é restrita a administradores da plataforma
              (platform_admin).
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Acessos</h1>
          <Badge variant="outline" className="text-text-2">
            admin only
          </Badge>
        </div>
        <p className="text-text-2">
          Criação manual de acesso para novos clientes. Não existe cadastro
          público no PULSO — todo acesso é liberado por aqui.
        </p>
      </div>

      <CreateClientAccountForm />
    </div>
  );
}
