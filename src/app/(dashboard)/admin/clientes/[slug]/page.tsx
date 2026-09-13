import Link from "next/link";
import { ArrowLeft, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdminOrgAccess } from "@/lib/supabase/admin-organization-server";
import { createClient } from "@/lib/supabase/server";
import {
  getClienteDirectoryEntry,
  viewClienteAsAdmin,
} from "@/app/actions/clientes";
import { getBinSummaryForOrg } from "@/app/actions/bin";
import { getMinSummaryForOrg } from "@/app/actions/min";
import { ToggleClienteStatusButton } from "./toggle-cliente-status-button";
import { AdminClienteTabs } from "./cliente-tabs";

export default async function AdminClienteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const { org, viewerRole } = await requireAdminOrgAccess(slug);

  const supabase = await createClient();
  const [entryResult, binResult, minResult, internalOrgResult] =
    await Promise.all([
      getClienteDirectoryEntry(org.id),
      getBinSummaryForOrg(org.id),
      getMinSummaryForOrg(org.id),
      supabase
        .from("organizations")
        .select("id")
        .eq("is_internal", true)
        .single(),
    ]);

  const entry = entryResult.success ? entryResult.data : null;
  const bin = binResult.success ? binResult.data : null;
  const min = minResult.success ? minResult.data : null;
  const internalOrgId = internalOrgResult.data?.id ?? null;
  const isEncerrado = !!entry?.deleted_at;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/clientes"
            className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text-1 mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Organizações
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
            <Badge variant="outline" className="text-text-2">
              {org.slug}
            </Badge>
            <Badge variant={isEncerrado ? "outline" : "success"}>
              {isEncerrado ? "Encerrado" : "Ativo"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEncerrado && (
            <form action={viewClienteAsAdmin.bind(null, org.id)}>
              <Button type="submit" variant="outline" size="sm">
                <LogIn className="mr-1.5 h-3.5 w-3.5" />
                Entrar como membro
              </Button>
            </form>
          )}
          {viewerRole === "platform_admin" && (
            <ToggleClienteStatusButton
              orgId={org.id}
              isEncerrado={isEncerrado}
              orgName={org.name}
            />
          )}
        </div>
      </div>

      <AdminClienteTabs
        orgId={org.id}
        entry={entry}
        bin={bin}
        min={min}
        viewerRole={viewerRole}
        isEncerrado={isEncerrado}
        internalOrgId={internalOrgId}
      />
    </div>
  );
}
