import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlatformRole } from "@/lib/supabase/platform-role-server";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Casa do cliente (/{slug}) — distinta de /admin/clientes/{slug}, que é a
 * visão da equipe Land Grow sobre esse mesmo cliente. Antes disso renderizava
 * o protótipo estático (kanban.html) via iframe, sem nenhuma ligação com o
 * banco — respostas de BIN nunca chegavam ao admin porque nunca eram
 * salvas de verdade.
 *
 * A página real (com sidebar, header etc.) já existe em
 * /clientes/{slug}/bin, dentro do grupo de rotas (dashboard) — é pra lá que
 * o atalho "BIN" do próprio menu (/bin) já redireciona. Essa rota só valida
 * acesso e redireciona pro mesmo lugar, em vez de duplicar a página fora do
 * layout com menu (o que a deixava sem sidebar nenhuma).
 */
export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<never> {
  const { slug } = await params;
  if (!SLUG.test(slug)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, is_internal, deleted_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!org || org.deleted_at || org.is_internal) notFound();

  const role = await getPlatformRole(supabase);
  if (!role) {
    const { data: member } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("org_id", org.id)
      .maybeSingle();
    if (!member) notFound();
  }

  redirect(`/clientes/${slug}`);
}
