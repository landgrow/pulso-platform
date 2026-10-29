import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Formulário" };

interface FormularioPageProps {
  params: Promise<{ slug: string }>;
}

export default async function FormularioPage({
  params,
}: FormularioPageProps): Promise<never> {
  const { slug } = await params;
  redirect(`/clientes/${slug}/bin`);
}
