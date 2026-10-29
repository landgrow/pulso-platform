import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { authorizeClientSlug } from "@/lib/auth/org-access";
import { PageHeader } from "@/components/ui/page-header";
import { PulsoChat } from "@/components/inteligencia/pulso-chat";
import { resolveLlm } from "@/lib/inteligencia/llm";

export const metadata: Metadata = { title: "Central IA" };

export default async function ClienteCentralIaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const auth = await authorizeClientSlug(slug);
  if (!auth.ok) notFound();

  const llm = resolveLlm();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central IA"
        description="Perguntas sobre a sua empresa, respondidas com o diagnóstico, as reuniões e as atividades que já estão no PULSO."
      />
      <PulsoChat
        surface="client"
        orgId={auth.org.id}
        slug={slug}
        {...("error" in llm
          ? { llmError: llm.error }
          : { llmLabel: llm.label })}
      />
    </div>
  );
}
