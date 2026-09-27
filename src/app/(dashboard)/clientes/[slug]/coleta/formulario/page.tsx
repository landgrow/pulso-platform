import { redirect } from "next/navigation";

interface FormularioPageProps {
  params: Promise<{ slug: string }>;
}

export default async function FormularioPage({
  params,
}: FormularioPageProps): Promise<never> {
  const { slug } = await params;
  redirect(`/clientes/${slug}/bin`);
}
