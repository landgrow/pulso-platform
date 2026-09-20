import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { dateInSaoPaulo } from "@/lib/notify/calendar";
import { sendTransactionalEmail } from "@/lib/notify/send-email";

export interface DeliverableEmail {
  userId: string;
  email: string;
  kind: string;
  entityKey: string;
  subject: string;
  text: string;
}

export async function deliverEmails(
  items: DeliverableEmail[],
  day: string = dateInSaoPaulo(),
): Promise<{ sent: number; skippedDuplicate: number; failed: number }> {
  const admin = await createAdminClient();
  let sent = 0;
  let skippedDuplicate = 0;
  let failed = 0;

  for (const item of items) {
    const { error: dupError } = await admin
      .from("notification_deliveries")
      .insert({
        user_id: item.userId,
        kind: item.kind,
        entity_key: item.entityKey,
        day,
      });

    if (dupError) {
      skippedDuplicate += 1;
      continue;
    }

    const result = await sendTransactionalEmail({
      to: item.email,
      subject: item.subject,
      text: item.text,
    });

    if (result.ok) {
      sent += 1;
      continue;
    }

    await admin
      .from("notification_deliveries")
      .delete()
      .eq("user_id", item.userId)
      .eq("kind", item.kind)
      .eq("entity_key", item.entityKey)
      .eq("day", day);

    if (!result.skipped) failed += 1;
  }

  return { sent, skippedDuplicate, failed };
}
