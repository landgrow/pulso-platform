import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getActiveOrganization,
  isActiveOrgInternal,
} from "@/lib/supabase/organization-server";

export const metadata: Metadata = { title: "BIN" };

/** Atalho do menu: BIN mora no espaço do cliente, não no HQ. */
export default async function BinShortcutPage(): Promise<never> {
  const active = await getActiveOrganization();
  if (!active) redirect("/dashboard");
  if (await isActiveOrgInternal()) redirect("/admin/clientes");
  redirect(`/clientes/${active.org.slug}/bin`);
}
