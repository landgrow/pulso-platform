import { notFound } from "next/navigation";
import { authorizeClientSlug } from "@/lib/auth/org-access";
import { CalendarWorkspace } from "@/components/calendario/calendar-workspace";

export default async function ClienteCalendarioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const auth = await authorizeClientSlug(slug);
  if (!auth.ok) notFound();

  return (
    <CalendarWorkspace
      orgId={auth.org.id}
      reunioesHref={`/clientes/${slug}/reunioes`}
    />
  );
}
