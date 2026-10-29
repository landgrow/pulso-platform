import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { authorizeClientSlug } from "@/lib/auth/org-access";
import { MindMapCanvas } from "@/components/mindmaps/mind-map-canvas";

export const metadata: Metadata = { title: "Projeto" };

export default async function ClienteProjetoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const auth = await authorizeClientSlug(slug);
  if (!auth.ok) notFound();

  return <MindMapCanvas orgId={auth.org.id} />;
}
