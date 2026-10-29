import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Métricas" };

/** Métricas virou o Dashboard — o resumo do negócio fica num lugar só. */
export default function AdminMetricasPage(): never {
  redirect("/dashboard");
}
