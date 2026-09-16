import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { MindMapCanvas } from "@/components/mindmaps/mind-map-canvas";

export default async function AdminMapaMentalPage(): Promise<JSX.Element> {
  const supabase = await createClient();

  try {
    await requireCapability(supabase, "mapa_mental");
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
    <div className="-m-6 flex h-[calc(100%+3rem)] min-h-0 flex-col lg:-m-8 lg:h-[calc(100%+4rem)]">
      <MindMapCanvas orgId={internalOrg.id} />
    </div>
  );
}
