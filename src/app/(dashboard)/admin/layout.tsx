import { createClient } from "@/lib/supabase/server";
import { requirePlatformStaff } from "@/lib/supabase/platform-role-server";
import { AccessDenied } from "@/components/admin/access-denied";
import { AdminHqRestore } from "@/components/layout/admin-hq-restore";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const supabase = await createClient();
  try {
    await requirePlatformStaff(supabase);
  } catch (error) {
    return (
      <AccessDenied
        message={
          error instanceof Error
            ? error.message
            : "Acesso negado. Apenas equipe Land Grow."
        }
      />
    );
  }

  return (
    <>
      <AdminHqRestore />
      {children}
    </>
  );
}
