import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { BinPageContent } from "@/components/admin/bin-page-content";

export default async function AdminBinPage(): Promise<JSX.Element> {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">BIN</h1>
        <Badge variant="outline" className="text-text-2">
          admin only
        </Badge>
      </div>
      <BinPageContent />
    </div>
  );
}
