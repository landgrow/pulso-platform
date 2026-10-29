import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Acessos" };

/** Acessos virou o botão Novo cliente em Organizações. */
export default function AcessosRedirectPage(): never {
  redirect("/admin/clientes");
}
