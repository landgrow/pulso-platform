import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  addDaysIso,
  dateInSaoPaulo,
  hourInSaoPaulo,
  weekdayInSaoPaulo,
} from "@/lib/notify/calendar";
import { isClosedColumnLabel } from "@/lib/boards/plano-de-acao-template";
import { answerSalaAgent, buildSalaOpsContext } from "@/lib/sala/agent-context";
import {
  isWorkflowDue,
  type WorkflowAction,
  type WorkflowTrigger,
} from "@/lib/sala/workflows";

export interface WorkflowJobResult {
  scanned: number;
  ran: number;
  skipped: number;
  failed: number;
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
  if (row.type === "meeting_soon") return { type: "meeting_soon" };
  if (row.type === "card_due") return { type: "card_due" };
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

export async function runDueSalaWorkflows(
  now: Date = new Date(),
): Promise<WorkflowJobResult> {
  const admin = await createAdminClient();
  const clock = {
    weekday: weekdayInSaoPaulo(now),
    hour: hourInSaoPaulo(now),
  };
  const { data: rows } = await admin
    .from("staff_workflows")
    .select("id, enabled, trigger, action, last_run_at")
    .eq("enabled", true);
  const result: WorkflowJobResult = {
    scanned: rows?.length ?? 0,
    ran: 0,
    skipped: 0,
    failed: 0,
  };
  const todayStamp = `${now.toISOString().slice(0, 13)}`;

  for (const row of rows ?? []) {
    const trigger = asTrigger(row.trigger);
    const action = asAction(row.action);
    if (!trigger || !action) {
      result.skipped += 1;
      continue;
    }
    if (!isWorkflowDue(trigger, clock)) {
      result.skipped += 1;
      continue;
    }
    const last = row.last_run_at ? String(row.last_run_at).slice(0, 13) : "";
    if (last === todayStamp) {
      result.skipped += 1;
      continue;
    }

    const { data: channel } = await admin
      .from("staff_channels")
      .select("id")
      .eq("kind", "channel")
      .eq("slug", action.channelSlug)
      .maybeSingle();
    if (!channel?.id) {
      result.failed += 1;
      await admin.from("staff_workflow_runs").insert({
        workflow_id: row.id,
        status: "error",
        detail: `Canal #${action.channelSlug} não existe.`,
      });
      continue;
    }

    const { data: starter } = await admin
      .from("staff_workflows")
      .select("created_by")
      .eq("id", row.id)
      .maybeSingle();
    const authorId = (starter?.created_by as string | null) ?? null;
    if (!authorId) {
      result.failed += 1;
      continue;
    }

    const body = await composeWorkflowBody(admin, trigger, action);
    const { error } = await admin.from("staff_messages").insert({
      channel_id: channel.id,
      author_id: authorId,
      kind: "bot",
      body,
    });
    if (error) {
      result.failed += 1;
      await admin.from("staff_workflow_runs").insert({
        workflow_id: row.id,
        status: "error",
        detail: error.message,
      });
      continue;
    }
    await admin
      .from("staff_workflows")
      .update({ last_run_at: now.toISOString() })
      .eq("id", row.id);
    await admin.from("staff_workflow_runs").insert({
      workflow_id: row.id,
      status: "ok",
      detail: `Publicado em #${action.channelSlug}`,
    });
    result.ran += 1;
  }
  return result;
}

async function composeWorkflowBody(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  trigger: WorkflowTrigger,
  action: WorkflowAction,
): Promise<string> {
  const prompt = action.body;
  if (action.useAi) {
    const context = await buildSalaOpsContext(admin);
    const answer = await answerSalaAgent(action.aiPrompt ?? prompt, context);
    if (answer.ok) return answer.text;
  }
  if (trigger.type !== "meeting_soon" && trigger.type !== "card_due") {
    return prompt;
  }
  const today = dateInSaoPaulo();
  const tomorrow = addDaysIso(today, 1);
  if (trigger.type === "meeting_soon") {
    const [{ data: meetings }, { data: events }] = await Promise.all([
      admin
        .from("meetings")
        .select("titulo, data, hora_inicio")
        .gte("data", today)
        .lte("data", tomorrow)
        .order("data", { ascending: true }),
      admin
        .from("staff_calendar_events")
        .select("title, starts_at")
        .gte("starts_at", `${today}T00:00:00-03:00`)
        .lte("starts_at", `${tomorrow}T23:59:59-03:00`)
        .order("starts_at", { ascending: true }),
    ]);
    const lines = [
      ...(meetings ?? []).map(
        (row) =>
          `- ${String(row.data).slice(0, 10)} ${String(row.hora_inicio ?? "").slice(0, 5)} · ${row.titulo}`,
      ),
      ...(events ?? []).map(
        (row) =>
          `- ${String(row.starts_at).slice(0, 16).replace("T", " ")} · ${row.title}`,
      ),
    ];
    return [
      prompt,
      "",
      "Agenda de hoje e amanhã:",
      ...(lines.length ? lines : ["- nada marcado"]),
    ].join("\n");
  }
  const { data: cards } = await admin
    .from("board_cards")
    .select("titulo, prazo, board_columns!inner(label)")
    .eq("prazo", tomorrow)
    .limit(30);
  const open = (cards ?? []).filter((row) => {
    const col = row.board_columns as
      { label?: string } | { label?: string }[] | null;
    const label = Array.isArray(col) ? col[0]?.label : col?.label;
    return !isClosedColumnLabel(label ?? "");
  });
  const lines = open.map((row) => `- ${row.prazo} · ${row.titulo}`);
  return [
    prompt,
    "",
    "Prazos que vencem amanhã:",
    ...(lines.length ? lines : ["- nenhum"]),
  ].join("\n");
}
