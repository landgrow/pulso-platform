import { redirect } from "next/navigation";

/** Métricas virou o Dashboard — o resumo do negócio fica num lugar só. */
export default function AdminMetricasPage(): never {
  redirect("/dashboard");
}
