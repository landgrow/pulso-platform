import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { AtividadesShell } from "@/components/atividades/atividades-shell";

export default async function AdminAtividadesPage(): Promise<JSX.Element> {
  const supabase = await createClient();

  try {
    await requireCapability(supabase, "atividades");
  } catch (e) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
            <h1 className="text-xl font-semibold mb-2">Acesso negado</h1>
            <p className="text-text-2 text-sm">
              {e instanceof Error
                ? e.message
                : "Apenas administradores da plataforma."}
            </p>
          </CardContent>
        </Card>
      </div>
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
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Atividades</h1>
          <Badge variant="outline" className="text-text-2">
            operação
          </Badge>
        </div>
        <p className="text-text-2">
          Quadro interno da Land Grow. O kanban “Tarefas administrativas” só
          aparece para admin — o consultor não vê essas atividades.
        </p>
      </div>

      <AtividadesShell orgId={internalOrg.id} />
    </div>
  );
}
