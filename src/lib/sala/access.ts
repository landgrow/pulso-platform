import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = Awaited<ReturnType<typeof createAdminClient>>;

export type SalaChannelRow = {
  id: string;
  kind: "channel" | "dm";
  slug: string | null;
  name: string;
  topic: string | null;
};

export async function assertChannelAccess(
  admin: Admin,
  channelId: string,
  userId: string,
): Promise<SalaChannelRow | null> {
  const { data } = await admin
    .from("staff_channels")
    .select("id, kind, slug, name, topic")
    .eq("id", channelId)
    .maybeSingle();
  if (!data) return null;
  const row = data as SalaChannelRow;
  if (row.kind === "channel") return row;
  const { data: member } = await admin
    .from("staff_channel_members")
    .select("user_id")
    .eq("channel_id", channelId)
    .eq("user_id", userId)
    .maybeSingle();
  return member ? row : null;
}

export async function visibleSalaChannelIds(
  admin: Admin,
  userId: string,
): Promise<string[]> {
  const [{ data: channels }, { data: members }] = await Promise.all([
    admin.from("staff_channels").select("id, kind"),
    admin
      .from("staff_channel_members")
      .select("channel_id")
      .eq("user_id", userId),
  ]);
  const memberOf = new Set(
    (members ?? []).map((row) => row.channel_id as string),
  );
  return (channels ?? [])
    .filter((row) => row.kind === "channel" || memberOf.has(row.id as string))
    .map((row) => row.id as string);
}
