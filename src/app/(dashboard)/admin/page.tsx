import { redirect } from "next/navigation";

/** /admin não tem tela própria — o home da operação é o Dashboard. */
export default function AdminIndexPage(): never {
  redirect("/dashboard");
}
