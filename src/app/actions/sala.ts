"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import {
  assertChannelAccess,
  type SalaChannelRow as ChannelRow,
} from "@/lib/sala/access";
import { extractMentionIds } from "@/lib/boards/card-people";
import { deliverEmails } from "@/lib/notify/deliver";
import {
  dmSlug,
  otherDmUserId,
  previewBody,
  staffDisplayName,
} from "@/lib/sala/dm";
import { tallySalaUnread } from "@/lib/sala/unread";
import {
  SALA_EMOJIS,
  type SalaBootstrap,
  type SalaChannel,
  type SalaFile,
  type SalaMessage,
  type SalaMessageKind,
  type SalaReaction,
  type SalaSearchHit,
  type SalaStaff,
} from "@/types/sala";

type Result<T> = { success: true; data: T } | { success: false; error: string };
type Admin = Awaited<ReturnType<typeof createAdminClient>>;

const uuidSchema = z.string().uuid();
const bodySchema = z.string().trim().min(1, "Escreva a mensagem.").max(8000);
const emojiSchema = z.enum(SALA_EMOJIS);

export async function requireSala(): Promise<
  { ok: true; userId: string; admin: Admin } | { ok: false; error: string }
> {
  const supabase = await createClient();
  try {
    await requireCapability(supabase, "sala");
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Acesso negado a esta função.",
    };
  }
  const user = await getRequestUser();
  if (!user) return { ok: false, error: "Sessão expirada." };
  return { ok: true, userId: user.id, admin: await createAdminClient() };
}

type MessageRow = {
  id: string;
  channel_id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
  kind?: string | null;
};

async function loadStaffMap(
  admin: Admin,
): Promise<{ staff: SalaStaff[]; names: Map<string, string> }> {
  const { data: roles, error } = await admin
    .from("platform_roles")
    .select("user_id")
    .in("role", ["platform_admin", "consultant"]);
  if (error) throw new Error(error.message);
  const ids = [...new Set((roles ?? []).map((row) => row.user_id as string))];
  if (ids.length === 0) return { staff: [], names: new Map() };
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);
  if (profileError) throw new Error(profileError.message);
  const names = new Map<string, string>();
  for (const row of profiles ?? []) {
    names.set(
      row.id as string,
      staffDisplayName(row.full_name as string | null),
    );
  }
  for (const id of ids) {
    if (!names.has(id)) names.set(id, staffDisplayName(null));
  }
  const staff = ids
    .map((userId) => ({ userId, name: names.get(userId) ?? "Colega" }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return { staff, names };
}

async function ensurePublicMemberships(
  admin: Admin,
  userId: string,
  channels: ChannelRow[],
): Promise<void> {
  const publicIds = channels
    .filter((channel) => channel.kind === "channel")
    .map((channel) => channel.id);
  if (publicIds.length === 0) return;
  await admin.from("staff_channel_members").upsert(
    publicIds.map((channel_id) => ({ channel_id, user_id: userId })),
    { onConflict: "channel_id,user_id", ignoreDuplicates: true },
  );
}

function mapChannel(
  row: ChannelRow,
  meId: string,
  names: Map<string, string>,
  unread: number,
  lastMessageAt: string | null,
  lastPreview: string | null,
): SalaChannel {
  const peerId = otherDmUserId(row.slug, meId);
  const displayName =
    row.kind === "dm"
      ? (names.get(peerId ?? "") ?? "Mensagem direta")
      : row.name;
  return {
    id: row.id,
    kind: row.kind,
    slug: row.slug,
    name: row.name,
    topic: row.topic,
    displayName,
    unread,
    lastMessageAt,
    lastPreview,
    peerId,
  };
}

export async function listSala(): Promise<Result<SalaBootstrap>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const { admin, userId } = gate;

  try {
    const { staff, names } = await loadStaffMap(admin);
    const { data: channelRows, error } = await admin
      .from("staff_channels")
      .select("id, kind, slug, name, topic")
      .order("created_at", { ascending: true });
    if (error) return { success: false, error: error.message };

    const all = (channelRows ?? []) as ChannelRow[];
    await ensurePublicMemberships(admin, userId, all);

    const { data: memberRows } = await admin
      .from("staff_channel_members")
      .select("channel_id, last_read_at")
      .eq("user_id", userId);
    const membership = new Map(
      (memberRows ?? []).map((row) => [
        row.channel_id as string,
        (row.last_read_at as string | null) ?? null,
      ]),
    );

    const visible = all.filter((channel) => {
      if (channel.kind === "channel") return true;
      return membership.has(channel.id);
    });

    const visibleIds = visible.map((channel) => channel.id);
    const lastByChannel = new Map<
      string,
      { at: string; preview: string; unread: number }
    >();
    if (visibleIds.length > 0) {
      const { data: messages } = await admin
        .from("staff_messages")
        .select("channel_id, author_id, body, created_at")
        .in("channel_id", visibleIds)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(800);
      for (const row of messages ?? []) {
        const channelId = row.channel_id as string;
        const createdAt = row.created_at as string;
        const current = lastByChannel.get(channelId);
        if (!current) {
          lastByChannel.set(channelId, {
            at: createdAt,
            preview: previewBody(row.body as string),
            unread: 0,
          });
        }
        const lastRead = membership.get(channelId);
        const fromOther = (row.author_id as string) !== userId;
        const unseen = !lastRead || createdAt > lastRead;
        if (fromOther && unseen) {
          const bucket = lastByChannel.get(channelId);
          if (bucket) bucket.unread += 1;
        }
      }
    }

    const channels = visible.map((channel) => {
      const last = lastByChannel.get(channel.id);
      return mapChannel(
        channel,
        userId,
        names,
        last?.unread ?? 0,
        last?.at ?? null,
        last?.preview ?? null,
      );
    });

    channels.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "channel" ? -1 : 1;
      return a.displayName.localeCompare(b.displayName, "pt-BR");
    });

    return { success: true, data: { meId: userId, channels, staff } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Não foi possível abrir a Sala.",
    };
  }
}

export async function getSalaUnreadTotal(): Promise<
  Result<{ unread: number }>
> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const { admin, userId } = gate;
  try {
    const { data: channelRows, error } = await admin
      .from("staff_channels")
      .select("id, kind");
    if (error) return { success: false, error: error.message };

    const { data: memberRows } = await admin
      .from("staff_channel_members")
      .select("channel_id, last_read_at")
      .eq("user_id", userId);
    const membership = new Map(
      (memberRows ?? []).map((row) => [
        row.channel_id as string,
        (row.last_read_at as string | null) ?? null,
      ]),
    );

    const visible = (channelRows ?? []).filter((channel) => {
      if ((channel.kind as string) === "channel") return true;
      return membership.has(channel.id as string);
    });
    const visibleIds = visible.map((channel) => channel.id as string);
    if (visibleIds.length === 0) return { success: true, data: { unread: 0 } };

    const { data: messages } = await admin
      .from("staff_messages")
      .select("channel_id, author_id, created_at")
      .in("channel_id", visibleIds)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(800);

    const unread = tallySalaUnread(
      (messages ?? []).map((row) => ({
        channelId: row.channel_id as string,
        authorId: row.author_id as string,
        createdAt: row.created_at as string,
      })),
      membership,
      userId,
    );
    return { success: true, data: { unread } };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error
          ? e.message
          : "Não foi possível contar as mensagens.",
    };
  }
}

const createChannelSchema = z.object({
  name: z.string().trim().min(2, "Nome curto demais.").max(40),
  topic: z.string().trim().max(160).optional(),
});

export async function createSalaChannel(
  input: unknown,
): Promise<Result<SalaChannel>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const parsed = createChannelSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }
  const { admin, userId } = gate;
  const { names } = await loadStaffMap(admin);
  const { data: existing } = await admin
    .from("staff_channels")
    .select("slug")
    .eq("kind", "channel");
  const slug = ensureUniqueSlug(
    generateSlug(parsed.data.name) || "canal",
    (existing ?? []).map((row) => row.slug as string).filter(Boolean),
  );
  const topic =
    parsed.data.topic && parsed.data.topic.length > 0
      ? parsed.data.topic
      : null;
  const { data, error } = await admin
    .from("staff_channels")
    .insert({
      kind: "channel",
      slug,
      name: parsed.data.name,
      topic,
      created_by: userId,
    })
    .select("id, kind, slug, name, topic")
    .single();
  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Não foi possível criar o canal.",
    };
  }
  await admin.from("staff_channel_members").upsert({
    channel_id: data.id,
    user_id: userId,
  });
  return {
    success: true,
    data: mapChannel(data as ChannelRow, userId, names, 0, null, null),
  };
}

export async function openSalaDm(
  peerUserId: string,
): Promise<Result<SalaChannel>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const parsed = uuidSchema.safeParse(peerUserId);
  if (!parsed.success) return { success: false, error: "Pessoa inválida." };
  if (parsed.data === gate.userId) {
    return { success: false, error: "Escolha outra pessoa da equipe." };
  }
  const { admin, userId } = gate;
  const { names } = await loadStaffMap(admin);
  if (!names.has(parsed.data)) {
    return { success: false, error: "Só a equipe Land Grow entra na Sala." };
  }
  const slug = dmSlug(userId, parsed.data);
  const { data: existing } = await admin
    .from("staff_channels")
    .select("id, kind, slug, name, topic")
    .eq("kind", "dm")
    .eq("slug", slug)
    .maybeSingle();
  let row = existing as ChannelRow | null;
  if (!row) {
    const { data, error } = await admin
      .from("staff_channels")
      .insert({
        kind: "dm",
        slug,
        name: "DM",
        created_by: userId,
      })
      .select("id, kind, slug, name, topic")
      .single();
    if (error || !data) {
      return {
        success: false,
        error: error?.message ?? "Não foi possível abrir a conversa.",
      };
    }
    row = data as ChannelRow;
  }
  await admin.from("staff_channel_members").upsert(
    [
      { channel_id: row.id, user_id: userId },
      { channel_id: row.id, user_id: parsed.data },
    ],
    { onConflict: "channel_id,user_id" },
  );
  return {
    success: true,
    data: mapChannel(row, userId, names, 0, null, null),
  };
}

async function hydrateMessages(
  admin: Admin,
  rows: MessageRow[],
  meId: string,
): Promise<SalaMessage[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const authorIds = [...new Set(rows.map((row) => row.author_id))];
  const [
    { data: profiles },
    { data: replies },
    { data: reactionRows },
    { data: fileRows },
  ] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", authorIds),
    admin.from("staff_messages").select("parent_id").in("parent_id", ids),
    admin
      .from("staff_message_reactions")
      .select("message_id, user_id, emoji")
      .in("message_id", ids),
    admin
      .from("staff_message_files")
      .select("id, channel_id, message_id, name, mime, size_bytes, created_at")
      .in("message_id", ids),
  ]);
  const names = new Map<string, string>();
  for (const profile of profiles ?? []) {
    names.set(
      profile.id as string,
      staffDisplayName(profile.full_name as string | null),
    );
  }
  const replyCount = new Map<string, number>();
  for (const reply of replies ?? []) {
    const parentId = reply.parent_id as string;
    replyCount.set(parentId, (replyCount.get(parentId) ?? 0) + 1);
  }
  const reactionMap = new Map<
    string,
    Map<string, { count: number; mine: boolean }>
  >();
  for (const row of reactionRows ?? []) {
    const messageId = row.message_id as string;
    const emoji = row.emoji as string;
    const bucket = reactionMap.get(messageId) ?? new Map();
    const current = bucket.get(emoji) ?? { count: 0, mine: false };
    current.count += 1;
    if ((row.user_id as string) === meId) current.mine = true;
    bucket.set(emoji, current);
    reactionMap.set(messageId, bucket);
  }
  const filesByMessage = new Map<string, SalaFile[]>();
  for (const file of fileRows ?? []) {
    const messageId = file.message_id as string | null;
    if (!messageId) continue;
    const list = filesByMessage.get(messageId) ?? [];
    list.push({
      id: file.id as string,
      channelId: file.channel_id as string,
      messageId,
      name: file.name as string,
      mime: (file.mime as string | null) ?? null,
      sizeBytes: (file.size_bytes as number | null) ?? null,
      createdAt: file.created_at as string,
    });
    filesByMessage.set(messageId, list);
  }
  return rows.map((row) => {
    const reactions: SalaReaction[] = [
      ...(reactionMap.get(row.id) ?? new Map()),
    ].map(([emoji, value]) => ({
      emoji,
      count: value.count,
      mine: value.mine,
    }));
    reactions.sort((a, b) => a.emoji.localeCompare(b.emoji));
    const kind: SalaMessageKind =
      row.kind === "bot" || row.kind === "system" ? row.kind : "user";
    return {
      id: row.id,
      channelId: row.channel_id,
      parentId: row.parent_id,
      authorId: row.author_id,
      authorName:
        kind === "bot" ? "PULSO" : (names.get(row.author_id) ?? "Colega"),
      body: row.body,
      createdAt: row.created_at,
      replyCount: replyCount.get(row.id) ?? 0,
      reactions,
      kind,
      files: filesByMessage.get(row.id) ?? [],
    };
  });
}

export async function insertSalaBotMessage(
  admin: Admin,
  opts: { channelId: string; authorId: string; body: string },
): Promise<SalaMessage | null> {
  const { data, error } = await admin
    .from("staff_messages")
    .insert({
      channel_id: opts.channelId,
      author_id: opts.authorId,
      body: opts.body,
      kind: "bot",
    })
    .select("id, channel_id, parent_id, author_id, body, created_at, kind")
    .single();
  if (error || !data) return null;
  const [message] = await hydrateMessages(
    admin,
    [data as MessageRow],
    opts.authorId,
  );
  return message ?? null;
}

export async function listSalaMessages(
  channelId: string,
  parentId?: string | null,
): Promise<Result<SalaMessage[]>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  if (!uuidSchema.safeParse(channelId).success) {
    return { success: false, error: "Canal inválido." };
  }
  const channel = await assertChannelAccess(gate.admin, channelId, gate.userId);
  if (!channel) return { success: false, error: "Canal não encontrado." };

  let query = gate.admin
    .from("staff_messages")
    .select("id, channel_id, parent_id, author_id, body, created_at, kind")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true })
    .limit(400);
  if (parentId) {
    if (!uuidSchema.safeParse(parentId).success) {
      return { success: false, error: "Thread inválida." };
    }
    query = query.or(`id.eq.${parentId},parent_id.eq.${parentId}`);
  } else {
    query = query.is("parent_id", null);
  }
  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  const messages = await hydrateMessages(
    gate.admin,
    (data ?? []) as MessageRow[],
    gate.userId,
  );
  return { success: true, data: messages };
}

const sendSchema = z.object({
  channelId: z.string().uuid(),
  body: bodySchema,
  parentId: z.string().uuid().optional(),
});

export async function sendSalaMessage(
  input: unknown,
): Promise<Result<SalaMessage>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Mensagem inválida.",
    };
  }
  const channel = await assertChannelAccess(
    gate.admin,
    parsed.data.channelId,
    gate.userId,
  );
  if (!channel) return { success: false, error: "Canal não encontrado." };
  if (parsed.data.parentId) {
    const { data: parent } = await gate.admin
      .from("staff_messages")
      .select("id, channel_id")
      .eq("id", parsed.data.parentId)
      .maybeSingle();
    if (!parent || (parent.channel_id as string) !== parsed.data.channelId) {
      return { success: false, error: "Thread não encontrada." };
    }
  }
  const insert: {
    channel_id: string;
    author_id: string;
    body: string;
    parent_id?: string;
  } = {
    channel_id: parsed.data.channelId,
    author_id: gate.userId,
    body: parsed.data.body,
  };
  if (parsed.data.parentId) insert.parent_id = parsed.data.parentId;
  const { data, error } = await gate.admin
    .from("staff_messages")
    .insert(insert)
    .select("id, channel_id, parent_id, author_id, body, created_at")
    .single();
  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Não foi possível enviar.",
    };
  }
  await gate.admin.from("staff_channel_members").upsert({
    channel_id: parsed.data.channelId,
    user_id: gate.userId,
    last_read_at: new Date().toISOString(),
  });
  const [message] = await hydrateMessages(
    gate.admin,
    [data as MessageRow],
    gate.userId,
  );
  if (!message) return { success: false, error: "Não foi possível enviar." };
  const { staff } = await loadStaffMap(gate.admin);
  const mentioned = extractMentionIds(parsed.data.body, staff).filter(
    (id) => id !== gate.userId && id !== "pulso",
  );
  if (mentioned.length > 0) {
    void notifySalaMentions({
      admin: gate.admin,
      messageId: message.id,
      channelName: channel.name,
      preview: parsed.data.body,
      ids: mentioned,
    });
  }
  return { success: true, data: message };
}

async function notifySalaMentions(opts: {
  admin: Admin;
  messageId: string;
  channelName: string;
  preview: string;
  ids: string[];
}): Promise<void> {
  const emails: Array<{
    userId: string;
    email: string;
    kind: string;
    entityKey: string;
    subject: string;
    text: string;
  }> = [];
  for (const id of opts.ids) {
    const { data } = await opts.admin.auth.admin.getUserById(id);
    const email = data.user?.email;
    if (!email) continue;
    emails.push({
      userId: id,
      email,
      kind: "sala_mention",
      entityKey: opts.messageId,
      subject: `PULSO · você foi marcado em ${opts.channelName}`,
      text: opts.preview.slice(0, 280),
    });
  }
  if (emails.length > 0) await deliverEmails(emails);
}

export async function toggleSalaReaction(
  messageId: string,
  emoji: string,
): Promise<Result<SalaMessage>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  if (!uuidSchema.safeParse(messageId).success) {
    return { success: false, error: "Mensagem inválida." };
  }
  const parsedEmoji = emojiSchema.safeParse(emoji);
  if (!parsedEmoji.success)
    return { success: false, error: "Reação inválida." };
  const { data: messageRow } = await gate.admin
    .from("staff_messages")
    .select("id, channel_id, parent_id, author_id, body, created_at")
    .eq("id", messageId)
    .maybeSingle();
  if (!messageRow) return { success: false, error: "Mensagem não encontrada." };
  const channel = await assertChannelAccess(
    gate.admin,
    messageRow.channel_id as string,
    gate.userId,
  );
  if (!channel) return { success: false, error: "Canal não encontrado." };

  const { data: existing } = await gate.admin
    .from("staff_message_reactions")
    .select("emoji")
    .eq("message_id", messageId)
    .eq("user_id", gate.userId)
    .eq("emoji", parsedEmoji.data)
    .maybeSingle();
  if (existing) {
    await gate.admin
      .from("staff_message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", gate.userId)
      .eq("emoji", parsedEmoji.data);
  } else {
    await gate.admin.from("staff_message_reactions").insert({
      message_id: messageId,
      user_id: gate.userId,
      emoji: parsedEmoji.data,
    });
  }
  const [message] = await hydrateMessages(
    gate.admin,
    [messageRow as MessageRow],
    gate.userId,
  );
  if (!message) return { success: false, error: "Não foi possível reagir." };
  return { success: true, data: message };
}

export async function markSalaRead(channelId: string): Promise<Result<true>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  if (!uuidSchema.safeParse(channelId).success) {
    return { success: false, error: "Canal inválido." };
  }
  const channel = await assertChannelAccess(gate.admin, channelId, gate.userId);
  if (!channel) return { success: false, error: "Canal não encontrado." };
  await gate.admin.from("staff_channel_members").upsert({
    channel_id: channelId,
    user_id: gate.userId,
    last_read_at: new Date().toISOString(),
  });
  return { success: true, data: true };
}

export async function searchSala(
  query: string,
): Promise<Result<SalaSearchHit[]>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const q = query.trim();
  if (q.length < 2) return { success: true, data: [] };
  const boot = await listSala();
  if (!boot.success) return boot;
  const visibleIds = boot.data.channels.map((channel) => channel.id);
  if (visibleIds.length === 0) return { success: true, data: [] };
  const { data, error } = await gate.admin
    .from("staff_messages")
    .select("id, channel_id, parent_id, author_id, body, created_at")
    .in("channel_id", visibleIds)
    .ilike("body", `%${q.replace(/[%_]/g, "")}%`)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return { success: false, error: error.message };
  const messages = await hydrateMessages(
    gate.admin,
    (data ?? []) as MessageRow[],
    gate.userId,
  );
  const names = new Map(
    boot.data.channels.map((channel) => [channel.id, channel.displayName]),
  );
  return {
    success: true,
    data: messages.map((message) => ({
      kind: "message" as const,
      id: message.id,
      title: names.get(message.channelId) ?? "Canal",
      snippet: message.body,
      channelId: message.channelId,
      channelName: names.get(message.channelId) ?? "Canal",
      message,
    })),
  };
}
