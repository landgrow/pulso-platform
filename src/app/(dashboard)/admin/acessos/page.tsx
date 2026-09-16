import { redirect } from "next/navigation";

/** Acessos virou o botão Novo cliente em Organizações. */
export default function AcessosRedirectPage(): never {
  redirect("/admin/clientes");
}
