import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { CalendarWorkspace } from "@/components/calendario/calendar-workspace";

export const metadata: Metadata = { title: "Calendário" };

export default async function AdminCalendarioPage(): Promise<JSX.Element> {
  const supabase = await createClient();
  try {
    await requireCapability(supabase, "calendario");
  } catch (e) {
    return (
      <AccessDenied
        message={
          e instanceof Error
            ? e.message
            : "Apenas a equipe com acesso ao Calendário."
        }
      />
    );
  }
  return <CalendarWorkspace />;
}
