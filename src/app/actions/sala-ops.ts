"use server";

import { z } from "zod";
import { insertSalaBotMessage, requireSala } from "@/app/actions/sala";
import { assertChannelAccess, visibleSalaChannelIds } from "@/lib/sala/access";
import { isSalaChannelFilePath } from "@/lib/sala/files";
import { createAdminClient } from "@/lib/supabase/admin";
import { encodeName, invalidNameReason } from "@/lib/documentos/storage-names";
import { answerSalaAgent, buildSalaOpsContext } from "@/lib/sala/agent-context";
import { staffDisplayName } from "@/lib/sala/dm";
import { salaKitById } from "@/lib/sala/templates";
import { addDaysIso, dateInSaoPaulo } from "@/lib/notify/calendar";
import { isClosedColumnLabel } from "@/lib/boards/plano-de-acao-template";
import {
  describeAction,
  describeTrigger,
  parseWorkflowPrompt,
  type WorkflowAction,
  type WorkflowTrigger,
} from "@/lib/sala/workflows";
import type {
  SalaCanvas,
  SalaCanvasComment,
  SalaCirculo,
  SalaFile,
  SalaList,
  SalaPulse,
  SalaSearchHit,
  SalaWorkflow,
} from "@/types/sala";

type Result<T> = { success: true; data: T } | { success: false; error: string };
type Admin = Awaited<ReturnType<typeof createAdminClient>>;
const uuid = z.string().uuid();
const BUCKET = "evidencias";

async function requireSalaChannel(
  channelId: string,
): Promise<
  { ok: true; userId: string; admin: Admin } | { ok: false; error: string }
> {
  const gate = await requireSala();
  if (!gate.ok) return gate;
  if (!uuid.safeParse(channelId).success) {
    return { ok: false, error: "Canal inválido." };
  }
  const channel = await assertChannelAccess(gate.admin, channelId, gate.userId);
  if (!channel) return { ok: false, error: "Canal não encontrado." };
  return gate;
}

function asTrigger(value: unknown): WorkflowTrigger | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    row.type === "weekly" &&
    typeof row.weekday === "number" &&
    typeof row.hour === "number"
  ) {
    return { type: "weekly", weekday: row.weekday, hour: row.hour };
  }
  if (row.type === "daily" && typeof row.hour === "number") {
    return { type: "daily", hour: row.hour };
  }
  if (row.type === "meeting_soon" || row.type === "card_due") {
    return { type: row.type };
  }
  return null;
}

function asAction(value: unknown): WorkflowAction | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    row.type === "post_sala" &&
    typeof row.channelSlug === "string" &&
    typeof row.body === "string"
  ) {
    const action: WorkflowAction = {
      type: "post_sala",
      channelSlug: row.channelSlug,
      body: row.body,
    };
    if (row.useAi === true) {
      action.useAi = true;
      if (typeof row.aiPrompt === "string") action.aiPrompt = row.aiPrompt;
    }
    return action;
  }
  return null;
}

export async function askSalaAgent(
  channelId: string,
  question: string,
): Promise<Result<{ text: string }>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  if (!uuid.safeParse(channelId).success)
    return { success: false, error: "Canal inválido." };
  const prompt = question.trim();
  if (prompt.length < 2)
    return { success: false, error: "Escreva a pergunta." };
  const context = await buildSalaOpsContext(gate.admin);
  const answer = await answerSalaAgent(prompt, context);
  if (!answer.ok) return { success: false, error: answer.error };
  const posted = await insertSalaBotMessage(gate.admin, {
    channelId,
    authorId: gate.userId,
    body: answer.text,
  });
  if (!posted)
    return {
      success: false,
      error: "O agente respondeu, mas a Sala não gravou.",
    };
  return { success: true, data: { text: answer.text } };
}

async function loadCanvasComments(
  admin: Admin,
  canvasId: string,
): Promise<SalaCanvasComment[]> {
  const { data: rows } = await admin
    .from("staff_canvas_comments")
    .select("id, author_id, body, created_at")
    .eq("canvas_id", canvasId)
    .order("created_at", { ascending: true });
  const ids = [...new Set((rows ?? []).map((row) => row.author_id as string))];
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] };
  const names = new Map(
    (profiles ?? []).map((row) => [
      row.id as string,
      staffDisplayName(row.full_name as string | null),
    ]),
  );
  return (rows ?? []).map((row) => ({
    id: row.id as string,
    authorId: row.author_id as string,
    authorName: names.get(row.author_id as string) ?? "Colega",
    body: row.body as string,
    createdAt: row.created_at as string,
  }));
}

export async function getSalaCanvas(
  channelId: string,
): Promise<Result<SalaCanvas | null>> {
  const gate = await requireSalaChannel(channelId);
  if (!gate.ok) return { success: false, error: gate.error };
  const { data } = await gate.admin
    .from("staff_canvases")
    .select("id, channel_id, title, body, updated_at")
    .eq("channel_id", channelId)
    .maybeSingle();
  if (!data) return { success: true, data: null };
  return {
    success: true,
    data: {
      id: data.id as string,
      channelId: data.channel_id as string,
      title: data.title as string,
      body: data.body as string,
      updatedAt: data.updated_at as string,
      comments: await loadCanvasComments(gate.admin, data.id as string),
    },
  };
}

export async function saveSalaCanvas(
  input: unknown,
): Promise<Result<SalaCanvas>> {
  const parsed = z
    .object({
      channelId: z.string().uuid(),
      title: z.string().trim().min(1).max(80),
      body: z.string().max(20000),
    })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: "Canvas inválido." };
  const gate = await requireSalaChannel(parsed.data.channelId);
  if (!gate.ok) return { success: false, error: gate.error };
  const payload = {
    channel_id: parsed.data.channelId,
    title: parsed.data.title,
    body: parsed.data.body,
    updated_by: gate.userId,
  };
  const existing = await gate.admin
    .from("staff_canvases")
    .select("id")
    .eq("channel_id", parsed.data.channelId)
    .maybeSingle();
  const query = existing.data?.id
    ? gate.admin
        .from("staff_canvases")
        .update(payload)
        .eq("id", existing.data.id)
    : gate.admin.from("staff_canvases").insert(payload);
  const { data, error } = await query
    .select("id, channel_id, title, body, updated_at")
    .single();
  if (error || !data) {
    return { success: false, error: error?.message ?? "Não gravou as notas." };
  }
  return {
    success: true,
    data: {
      id: data.id as string,
      channelId: data.channel_id as string,
      title: data.title as string,
      body: data.body as string,
      updatedAt: data.updated_at as string,
      comments: await loadCanvasComments(gate.admin, data.id as string),
    },
  };
}

export async function addSalaCanvasComment(
  channelId: string,
  body: string,
): Promise<Result<SalaCanvas>> {
  const gate = await requireSalaChannel(channelId);
  if (!gate.ok) return { success: false, error: gate.error };
  const text = body.trim();
  if (text.length < 1)
    return { success: false, error: "Escreva o comentário." };
  let canvasId: string | null = null;
  const existing = await getSalaCanvas(channelId);
  if (!existing.success) return existing;
  if (existing.data) {
    canvasId = existing.data.id;
  } else {
    const created = await saveSalaCanvas({
      channelId,
      title: "Canvas",
      body: "",
    });
    if (!created.success) return created;
    canvasId = created.data.id;
  }
  const { error } = await gate.admin.from("staff_canvas_comments").insert({
    canvas_id: canvasId,
    author_id: gate.userId,
    body: text,
  });
  if (error) return { success: false, error: error.message };
  const refreshed = await getSalaCanvas(channelId);
  if (!refreshed.success || !refreshed.data) {
    return {
      success: false,
      error: "Comentário gravado, mas o canvas não reabriu.",
    };
  }
  return { success: true, data: refreshed.data };
}

export async function applySalaChannelKit(
  channelId: string,
  kitId: string,
): Promise<Result<{ canvasTitle: string }>> {
  const gate = await requireSalaChannel(channelId);
  if (!gate.ok) return { success: false, error: gate.error };
  const kit = salaKitById(kitId);
  if (!kit) return { success: false, error: "Modelo não encontrado." };
  const canvas = await saveSalaCanvas({
    channelId,
    title: kit.canvasTitle,
    body: kit.canvasBody,
  });
  if (!canvas.success) return canvas;
  if (kit.listTitle) {
    const list = await createSalaList(kit.listTitle, channelId);
    if (list.success) {
      for (const item of kit.listItems ?? []) {
        await addSalaListItem(list.data.id, item);
      }
    }
  }
  return { success: true, data: { canvasTitle: kit.canvasTitle } };
}

export async function getSalaPulse(): Promise<Result<SalaPulse>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const today = dateInSaoPaulo();
  const horizon = addDaysIso(today, 7);
  const [{ data: meetings }, { data: due }, { data: internal }] =
    await Promise.all([
      gate.admin
        .from("meetings")
        .select("id")
        .gte("data", today)
        .lte("data", horizon),
      gate.admin
        .from("board_cards")
        .select("id, board_columns!inner(label)")
        .not("prazo", "is", null)
        .gte("prazo", today)
        .lte("prazo", horizon),
      gate.admin
        .from("organizations")
        .select("id")
        .eq("is_internal", true)
        .maybeSingle(),
    ]);
  let crmOpen = 0;
  let crmTotal = 0;
  let crmConverted = 0;
  if (internal?.id) {
    const { data: boards } = await gate.admin
      .from("boards")
      .select("id")
      .eq("org_id", internal.id)
      .eq("module", "crm");
    const ids = (boards ?? []).map((row) => row.id as string);
    if (ids.length > 0) {
      const { data: cards } = await gate.admin
        .from("board_cards")
        .select("id, board_columns!inner(label)")
        .in("board_id", ids)
        .limit(400);
      for (const card of cards ?? []) {
        crmTotal += 1;
        const col = card.board_columns as
          { label?: string } | { label?: string }[] | null;
        const label = Array.isArray(col) ? col[0]?.label : col?.label;
        if (isClosedColumnLabel(label ?? "")) crmConverted += 1;
        else crmOpen += 1;
      }
    }
  }
  const dueOpen = (due ?? []).filter((row) => {
    const col = row.board_columns as
      { label?: string } | { label?: string }[] | null;
    const label = Array.isArray(col) ? col[0]?.label : col?.label;
    return !isClosedColumnLabel(label ?? "");
  }).length;
  return {
    success: true,
    data: {
      crmOpen,
      meetings7d: (meetings ?? []).length,
      due7d: dueOpen,
      conversionRate: crmTotal > 0 ? crmConverted / crmTotal : null,
    },
  };
}

export async function listSalaLists(
  channelId?: string,
): Promise<Result<SalaList[]>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  let query = gate.admin
    .from("staff_lists")
    .select("id, channel_id, title")
    .order("created_at", { ascending: false });
  if (channelId) query = query.eq("channel_id", channelId);
  const { data: lists, error } = await query;
  if (error) return { success: false, error: error.message };
  const ids = (lists ?? []).map((row) => row.id as string);
  const { data: items } = ids.length
    ? await gate.admin
        .from("staff_list_items")
        .select("id, list_id, title, done, due_on, assignee_id, sort")
        .in("list_id", ids)
        .order("sort", { ascending: true })
    : { data: [] };
  const byList = new Map<string, SalaList["items"]>();
  for (const item of items ?? []) {
    const listId = item.list_id as string;
    const current = byList.get(listId) ?? [];
    current.push({
      id: item.id as string,
      title: item.title as string,
      done: Boolean(item.done),
      dueOn: (item.due_on as string | null) ?? null,
      assigneeId: (item.assignee_id as string | null) ?? null,
    });
    byList.set(listId, current);
  }
  return {
    success: true,
    data: (lists ?? []).map((row) => ({
      id: row.id as string,
      channelId: (row.channel_id as string | null) ?? null,
      title: row.title as string,
      items: byList.get(row.id as string) ?? [],
    })),
  };
}

export async function createSalaList(
  title: string,
  channelId?: string,
): Promise<Result<SalaList>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const name = title.trim();
  if (name.length < 2) return { success: false, error: "Dê um nome à lista." };
  const insert: Record<string, unknown> = {
    title: name,
    created_by: gate.userId,
  };
  if (channelId) insert.channel_id = channelId;
  const { data, error } = await gate.admin
    .from("staff_lists")
    .insert(insert)
    .select("id, channel_id, title")
    .single();
  if (error || !data) {
    return { success: false, error: error?.message ?? "Não criou a lista." };
  }
  return {
    success: true,
    data: {
      id: data.id as string,
      channelId: (data.channel_id as string | null) ?? null,
      title: data.title as string,
      items: [],
    },
  };
}

export async function addSalaListItem(
  listId: string,
  title: string,
  dueOn?: string,
): Promise<Result<true>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const name = title.trim();
  if (!uuid.safeParse(listId).success || name.length < 1) {
    return { success: false, error: "Item inválido." };
  }
  const row: Record<string, unknown> = { list_id: listId, title: name };
  if (dueOn) row.due_on = dueOn;
  const { error } = await gate.admin.from("staff_list_items").insert(row);
  if (error) return { success: false, error: error.message };
  return { success: true, data: true };
}

export async function toggleSalaListItem(
  itemId: string,
  done: boolean,
): Promise<Result<true>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const { error } = await gate.admin
    .from("staff_list_items")
    .update({ done })
    .eq("id", itemId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: true };
}

export async function createSalaFileUpload(
  channelId: string,
  fileName: string,
  size: number,
): Promise<Result<{ path: string; token: string; name: string }>> {
  const gate = await requireSalaChannel(channelId);
  if (!gate.ok) return { success: false, error: gate.error };
  const reason = invalidNameReason(fileName);
  if (reason) return { success: false, error: reason };
  if (size <= 0 || size > 80 * 1024 * 1024) {
    return { success: false, error: "Arquivo vazio ou maior que 80 MB." };
  }
  const path = `sala/${channelId}/${crypto.randomUUID()}-${encodeName(fileName)}`;
  const { data, error } = await gate.admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    return { success: false, error: "Não preparei o envio." };
  }
  return {
    success: true,
    data: { path: data.path, token: data.token, name: fileName },
  };
}

export async function attachSalaFile(input: {
  channelId: string;
  path: string;
  name: string;
  mime?: string;
  size?: number;
}): Promise<Result<SalaFile>> {
  const gate = await requireSalaChannel(input.channelId);
  if (!gate.ok) return { success: false, error: gate.error };
  if (!isSalaChannelFilePath(input.channelId, input.path)) {
    return { success: false, error: "Arquivo fora deste canal." };
  }
  const { data: message, error: messageError } = await gate.admin
    .from("staff_messages")
    .insert({
      channel_id: input.channelId,
      author_id: gate.userId,
      body: `Arquivo: ${input.name}`,
    })
    .select("id")
    .single();
  if (messageError || !message) {
    return {
      success: false,
      error: messageError?.message ?? "Não postou o arquivo.",
    };
  }
  const { data, error } = await gate.admin
    .from("staff_message_files")
    .insert({
      channel_id: input.channelId,
      message_id: message.id,
      name: input.name,
      path: input.path,
      mime: input.mime ?? null,
      size_bytes: input.size ?? null,
      created_by: gate.userId,
    })
    .select("id, channel_id, message_id, name, mime, size_bytes, created_at")
    .single();
  if (error || !data) {
    return { success: false, error: error?.message ?? "Não anexou o arquivo." };
  }
  return {
    success: true,
    data: {
      id: data.id as string,
      channelId: data.channel_id as string,
      messageId: (data.message_id as string | null) ?? null,
      name: data.name as string,
      mime: (data.mime as string | null) ?? null,
      sizeBytes: (data.size_bytes as number | null) ?? null,
      createdAt: data.created_at as string,
    },
  };
}

export async function listSalaFiles(): Promise<Result<SalaFile[]>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const allowed = await visibleSalaChannelIds(gate.admin, gate.userId);
  if (allowed.length === 0) return { success: true, data: [] };
  const { data, error } = await gate.admin
    .from("staff_message_files")
    .select("id, channel_id, message_id, name, mime, size_bytes, created_at")
    .in("channel_id", allowed)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: (data ?? []).map((row) => ({
      id: row.id as string,
      channelId: row.channel_id as string,
      messageId: (row.message_id as string | null) ?? null,
      name: row.name as string,
      mime: (row.mime as string | null) ?? null,
      sizeBytes: (row.size_bytes as number | null) ?? null,
      createdAt: row.created_at as string,
    })),
  };
}

export async function getSalaFileUrl(
  fileId: string,
): Promise<Result<{ url: string }>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const { data } = await gate.admin
    .from("staff_message_files")
    .select("path, name, channel_id")
    .eq("id", fileId)
    .maybeSingle();
  if (!data?.path) return { success: false, error: "Arquivo não encontrado." };
  const channel = await assertChannelAccess(
    gate.admin,
    data.channel_id as string,
    gate.userId,
  );
  if (!channel) return { success: false, error: "Arquivo não encontrado." };
  const signed = await gate.admin.storage
    .from(BUCKET)
    .createSignedUrl(data.path as string, 300, {
      download: data.name as string,
    });
  if (signed.error || !signed.data) {
    return { success: false, error: "Não abri o arquivo." };
  }
  return { success: true, data: { url: signed.data.signedUrl } };
}

export async function listSalaWorkflows(): Promise<Result<SalaWorkflow[]>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const { data, error } = await gate.admin
    .from("staff_workflows")
    .select("id, name, prompt, enabled, trigger, action, last_run_at")
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: (data ?? []).map((row) => {
      const trigger = asTrigger(row.trigger);
      const action = asAction(row.action);
      return {
        id: row.id as string,
        name: row.name as string,
        prompt: row.prompt as string,
        enabled: Boolean(row.enabled),
        triggerLabel: trigger ? describeTrigger(trigger) : "Gatilho inválido",
        actionLabel: action ? describeAction(action) : "Ação inválida",
        lastRunAt: (row.last_run_at as string | null) ?? null,
        trigger,
        action,
      };
    }),
  };
}

type ParsedDraft = NonNullable<ReturnType<typeof parseWorkflowPrompt>>;

export async function draftSalaWorkflow(prompt: string): Promise<
  Result<{
    name: string;
    triggerLabel: string;
    actionLabel: string;
    parsed: ParsedDraft;
  }>
> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const parsed = parseWorkflowPrompt(prompt);
  if (!parsed)
    return {
      success: false,
      error: "Não entendi o fluxo. Diga o dia, a hora e o recado.",
    };
  return {
    success: true,
    data: {
      name: parsed.name,
      triggerLabel: describeTrigger(parsed.trigger),
      actionLabel: describeAction(parsed.action),
      parsed,
    },
  };
}

export async function publishSalaWorkflow(
  parsed: NonNullable<ParsedDraft>,
  enabled = true,
): Promise<Result<SalaWorkflow>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const { data, error } = await gate.admin
    .from("staff_workflows")
    .insert({
      name: parsed.name,
      prompt: parsed.action.body,
      enabled,
      trigger: parsed.trigger,
      action: parsed.action,
      created_by: gate.userId,
    })
    .select("id, name, prompt, enabled, trigger, action, last_run_at")
    .single();
  if (error || !data) {
    return { success: false, error: error?.message ?? "Não publicou o fluxo." };
  }
  const trigger = asTrigger(data.trigger);
  const action = asAction(data.action);
  return {
    success: true,
    data: {
      id: data.id as string,
      name: data.name as string,
      prompt: data.prompt as string,
      enabled: Boolean(data.enabled),
      triggerLabel: trigger ? describeTrigger(trigger) : "",
      actionLabel: action ? describeAction(action) : "",
      lastRunAt: null,
      trigger,
      action,
    },
  };
}

export async function updateSalaWorkflow(
  id: string,
  parsed: NonNullable<ParsedDraft>,
): Promise<Result<SalaWorkflow>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  if (!uuid.safeParse(id).success) {
    return { success: false, error: "Fluxo inválido." };
  }
  const { data, error } = await gate.admin
    .from("staff_workflows")
    .update({
      name: parsed.name,
      prompt: parsed.action.body,
      trigger: parsed.trigger,
      action: parsed.action,
    })
    .eq("id", id)
    .select("id, name, prompt, enabled, trigger, action, last_run_at")
    .single();
  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Não atualizou o fluxo.",
    };
  }
  const trigger = asTrigger(data.trigger);
  const action = asAction(data.action);
  return {
    success: true,
    data: {
      id: data.id as string,
      name: data.name as string,
      prompt: data.prompt as string,
      enabled: Boolean(data.enabled),
      triggerLabel: trigger ? describeTrigger(trigger) : "",
      actionLabel: action ? describeAction(action) : "",
      lastRunAt: (data.last_run_at as string | null) ?? null,
      trigger,
      action,
    },
  };
}

export async function setSalaWorkflowEnabled(
  id: string,
  enabled: boolean,
): Promise<Result<true>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const { error } = await gate.admin
    .from("staff_workflows")
    .update({ enabled })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: true };
}

export async function getSalaCirculo(
  channelId: string,
): Promise<Result<SalaCirculo | null>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const { data: huddle } = await gate.admin
    .from("staff_circulos")
    .select("channel_id, started_by, started_at")
    .eq("channel_id", channelId)
    .maybeSingle();
  if (!huddle) return { success: true, data: null };
  const { data: peers } = await gate.admin
    .from("staff_circulo_peers")
    .select("user_id")
    .eq("channel_id", channelId);
  const ids = (peers ?? []).map((row) => row.user_id as string);
  const { data: profiles } = ids.length
    ? await gate.admin.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] };
  const names = new Map(
    (profiles ?? []).map((row) => [
      row.id as string,
      staffDisplayName(row.full_name as string | null),
    ]),
  );
  return {
    success: true,
    data: {
      channelId: huddle.channel_id as string,
      startedBy: huddle.started_by as string,
      startedAt: huddle.started_at as string,
      peers: ids.map((userId) => ({
        userId,
        name: names.get(userId) ?? "Colega",
      })),
    },
  };
}

export async function joinSalaCirculo(
  channelId: string,
): Promise<Result<SalaCirculo>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const existing = await getSalaCirculo(channelId);
  if (!existing.success) return existing;
  if (!existing.data) {
    const starts = new Date();
    const ends = new Date(starts.getTime() + 30 * 60_000);
    const { data: event } = await gate.admin
      .from("staff_calendar_events")
      .insert({
        title: "Círculo da Sala",
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        kind: "circulo",
        channel_id: channelId,
        created_by: gate.userId,
      })
      .select("id")
      .single();
    await gate.admin.from("staff_circulos").insert({
      channel_id: channelId,
      started_by: gate.userId,
      event_id: event?.id ?? null,
    });
    await gate.admin.from("staff_messages").insert({
      channel_id: channelId,
      author_id: gate.userId,
      kind: "system",
      body: "Círculo aberto. Quem entrar aparece aqui e o horário foi para o Calendário.",
    });
  }
  await gate.admin.from("staff_circulo_peers").upsert({
    channel_id: channelId,
    user_id: gate.userId,
  });
  const next = await getSalaCirculo(channelId);
  if (!next.success || !next.data) {
    return { success: false, error: "Não entrou no círculo." };
  }
  return { success: true, data: next.data };
}

export async function leaveSalaCirculo(
  channelId: string,
): Promise<Result<true>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  await gate.admin
    .from("staff_circulo_peers")
    .delete()
    .eq("channel_id", channelId)
    .eq("user_id", gate.userId);
  const { data: left } = await gate.admin
    .from("staff_circulo_peers")
    .select("user_id")
    .eq("channel_id", channelId);
  if ((left ?? []).length === 0) {
    await gate.admin
      .from("staff_circulos")
      .delete()
      .eq("channel_id", channelId);
  }
  return { success: true, data: true };
}

export async function searchSalaUniverse(
  query: string,
): Promise<Result<SalaSearchHit[]>> {
  const gate = await requireSala();
  if (!gate.ok) return { success: false, error: gate.error };
  const q = query.trim();
  if (q.length < 2) return { success: true, data: [] };
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const hits: SalaSearchHit[] = [];

  const { data: channels } = await gate.admin
    .from("staff_channels")
    .select("id, name, slug, kind")
    .ilike("name", like)
    .limit(8);
  for (const row of channels ?? []) {
    hits.push({
      kind: "channel",
      id: row.id as string,
      title: `#${row.name}`,
      snippet: (row.slug as string | null) ?? "",
      channelId: row.id as string,
      channelName: row.name as string,
    });
  }

  const { data: messages } = await gate.admin
    .from("staff_messages")
    .select("id, channel_id, body, created_at")
    .ilike("body", like)
    .order("created_at", { ascending: false })
    .limit(12);
  for (const row of messages ?? []) {
    hits.push({
      kind: "message",
      id: row.id as string,
      title: "Mensagem",
      snippet: row.body as string,
      channelId: row.channel_id as string,
      channelName: "Canal",
    });
  }

  const { data: files } = await gate.admin
    .from("staff_message_files")
    .select("id, channel_id, name")
    .ilike("name", like)
    .limit(8);
  for (const row of files ?? []) {
    hits.push({
      kind: "file",
      id: row.id as string,
      title: row.name as string,
      snippet: "Arquivo da Sala",
      channelId: row.channel_id as string,
      channelName: "Arquivos",
    });
  }

  const { data: canvases } = await gate.admin
    .from("staff_canvases")
    .select("id, channel_id, title, body")
    .or(`title.ilike.${like},body.ilike.${like}`)
    .limit(6);
  for (const row of canvases ?? []) {
    hits.push({
      kind: "canvas",
      id: row.id as string,
      title: row.title as string,
      snippet: String(row.body).slice(0, 120),
      channelId: row.channel_id as string,
      channelName: "Canvas",
    });
  }

  const { data: events } = await gate.admin
    .from("staff_calendar_events")
    .select("id, title, starts_at")
    .ilike("title", like)
    .limit(8);
  for (const row of events ?? []) {
    hits.push({
      kind: "event",
      id: row.id as string,
      title: row.title as string,
      snippet: String(row.starts_at),
      channelId: null,
      channelName: "Calendário",
    });
  }

  const { data: lists } = await gate.admin
    .from("staff_lists")
    .select("id, title, channel_id")
    .ilike("title", like)
    .limit(6);
  for (const row of lists ?? []) {
    hits.push({
      kind: "list",
      id: row.id as string,
      title: row.title as string,
      snippet: "Lista",
      channelId: (row.channel_id as string | null) ?? null,
      channelName: "Listas",
    });
  }

  const { data: cards } = await gate.admin
    .from("board_cards")
    .select("id, titulo, boards!inner(name, module)")
    .eq("boards.module", "crm")
    .ilike("titulo", like)
    .limit(8);
  for (const row of cards ?? []) {
    const board = row.boards as { name?: string } | { name?: string }[] | null;
    const name = Array.isArray(board) ? board[0]?.name : board?.name;
    hits.push({
      kind: "crm",
      id: row.id as string,
      title: row.titulo as string,
      snippet: name ?? "CRM",
      channelId: null,
      channelName: "CRM",
    });
  }

  const { data: meetings } = await gate.admin
    .from("meetings")
    .select("id, titulo, data")
    .ilike("titulo", like)
    .limit(8);
  for (const row of meetings ?? []) {
    hits.push({
      kind: "event",
      id: `meeting:${row.id as string}`,
      title: row.titulo as string,
      snippet: String(row.data).slice(0, 10),
      channelId: null,
      channelName: "Reuniões",
    });
  }

  const { data: roles } = await gate.admin
    .from("platform_roles")
    .select("user_id")
    .in("role", ["platform_admin", "consultant"]);
  const staffIds = [
    ...new Set((roles ?? []).map((row) => row.user_id as string)),
  ];
  if (staffIds.length > 0) {
    const { data: people } = await gate.admin
      .from("profiles")
      .select("id, full_name")
      .in("id", staffIds)
      .ilike("full_name", like)
      .limit(8);
    for (const row of people ?? []) {
      hits.push({
        kind: "person",
        id: row.id as string,
        title: staffDisplayName(row.full_name as string | null),
        snippet: "Equipe",
        channelId: null,
        channelName: "Pessoas",
      });
    }
  }

  return { success: true, data: hits.slice(0, 40) };
}
