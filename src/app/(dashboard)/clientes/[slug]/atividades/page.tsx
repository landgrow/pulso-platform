import { notFound } from "next/navigation";
import { authorizeClientSlug } from "@/lib/auth/org-access";
import { AtividadesShell } from "@/components/atividades/atividades-shell";

export default async function ClienteAtividadesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const auth = await authorizeClientSlug(slug);
  if (!auth.ok) notFound();

  return (
    <AtividadesShell
      orgId={auth.org.id}
      variant={auth.access.platformRole ? "staff" : "client"}
    />
  );
}
