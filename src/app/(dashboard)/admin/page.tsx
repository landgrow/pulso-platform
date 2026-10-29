import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "HQ" };

/** /admin não tem tela própria — o home da operação é o Dashboard. */
export default function AdminIndexPage(): never {
  redirect("/dashboard");
}
