import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlatformRole } from "@/lib/supabase/platform-role-server";
import { ClientPortal } from "./client-portal";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  if (!SLUG.test(slug)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, name, is_internal, deleted_at")
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

  return <ClientPortal orgSlug={org.slug} orgName={org.name} />;
}
