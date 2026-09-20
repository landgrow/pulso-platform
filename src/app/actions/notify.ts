"use server";

import { createClient } from "@/lib/supabase/server";
import { isPlatformStaff } from "@/lib/supabase/platform-role-server";
import { runNotificationJob } from "@/lib/notify/run-job";

type Result<T> = { success: true; data: T } | { success: false; error: string };

export async function getLaunchReadiness(): Promise<
  Result<{ cronSecret: boolean; resend: boolean; fromEmail: boolean }>
> {
  const supabase = await createClient();
  if (!(await isPlatformStaff(supabase))) {
    return { success: false, error: "Só a equipe Land Grow vê o ambiente." };
  }
  return {
    success: true,
    data: {
      cronSecret: Boolean(process.env.CRON_SECRET),
      resend: Boolean(process.env.RESEND_API_KEY),
      fromEmail: Boolean(process.env.NOTIFY_FROM_EMAIL),
    },
  };
}

export async function runNotificationsNow(): Promise<
  Result<Awaited<ReturnType<typeof runNotificationJob>>>
> {
  const supabase = await createClient();
  if (!(await isPlatformStaff(supabase))) {
    return { success: false, error: "Só a equipe Land Grow dispara avisos." };
  }
  try {
    const data = await runNotificationJob();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Falha ao disparar avisos",
    };
  }
}
