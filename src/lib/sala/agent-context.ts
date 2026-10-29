import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { createAdminClient } from "@/lib/supabase/admin";
import { addDaysIso, dateInSaoPaulo } from "@/lib/notify/calendar";
import { isClosedColumnLabel } from "@/lib/boards/plano-de-acao-template";

type Admin = Awaited<ReturnType<typeof createAdminClient>>;

function textFromMessage(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => {
      if (
        block &&
        typeof block === "object" &&
        "type" in block &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string"
      ) {
        return block.text;
      }
      return "";
    })
    .join("\n")
    .trim();
}

export async function buildSalaOpsContext(admin: Admin): Promise<string> {
  const today = dateInSaoPaulo();
  const horizon = addDaysIso(today, 7);
  const [orgsRes, meetingsRes, internalRes, dueRes, calendarRes, listsRes] =
    await Promise.all([
      admin
        .from("organizations")
        .select("id, name, slug, is_internal")
        .is("deleted_at", null)
        .order("name"),
      admin
        .from("meetings")
        .select("id, titulo, data, hora_inicio, org_id, link, transcricao")
        .gte("data", today)
        .lte("data", horizon)
        .order("data", { ascending: true })
        .limit(40),
      admin
        .from("organizations")
        .select("id")
        .eq("is_internal", true)
        .maybeSingle(),
      admin
        .from("board_cards")
        .select(
          "id, titulo, prazo, boards!inner(name, module, org_id, organizations!inner(name, slug)), board_columns!inner(label)",
        )
        .not("prazo", "is", null)
        .gte("prazo", today)
        .lte("prazo", horizon)
        .limit(40),
      admin
        .from("staff_calendar_events")
        .select("title, starts_at, kind")
        .gte("starts_at", `${today}T00:00:00-03:00`)
        .lte("starts_at", `${horizon}T23:59:59-03:00`)
        .order("starts_at", { ascending: true })
        .limit(30),
      admin
        .from("staff_lists")
        .select("id, title")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

  const orgName = new Map(
    (orgsRes.data ?? []).map((row) => [row.id as string, row.name as string]),
  );
  const clientes = (orgsRes.data ?? [])
    .filter((row) => !row.is_internal)
    .map((row) => `- ${row.name} (${row.slug})`)
    .slice(0, 30);

  const meetings = (meetingsRes.data ?? []).map((row) => {
    const when =
      `${String(row.data).slice(0, 10)} ${String(row.hora_inicio ?? "").slice(0, 5)}`.trim();
    const transcript = String(row.transcricao ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const excerpt = transcript
      ? ` · transcrição: ${transcript.slice(0, 280)}`
      : "";
    return `- ${when} · ${row.titulo} · ${orgName.get(row.org_id as string) ?? "org"}${excerpt}`;
  });

  const prazos = (dueRes.data ?? [])
    .filter((row) => {
      const col = row.board_columns as
        { label?: string } | { label?: string }[] | null;
      const label = Array.isArray(col) ? col[0]?.label : col?.label;
      return !isClosedColumnLabel(label ?? "");
    })
    .map((row) => {
      const board = row.boards as
        | { name?: string; module?: string; organizations?: { name?: string } }
        | {
            name?: string;
            module?: string;
            organizations?: { name?: string };
          }[]
        | null;
      const boardRow = Array.isArray(board) ? board[0] : board;
      return `- ${row.prazo} · ${row.titulo} · ${boardRow?.name ?? "lista"} · ${boardRow?.organizations?.name ?? ""}`;
    });

  let crm = "sem kanban de CRM";
  if (internalRes.data?.id) {
    const { data: boards } = await admin
      .from("boards")
      .select("id, name")
      .eq("org_id", internalRes.data.id)
      .eq("module", "crm");
    const boardIds = (boards ?? []).map((row) => row.id as string);
    if (boardIds.length > 0) {
      const { data: cards } = await admin
        .from("board_cards")
        .select("titulo, board_id, board_columns!inner(label)")
        .in("board_id", boardIds)
        .limit(80);
      const byBoard = new Map<string, { open: number; titles: string[] }>();
      for (const board of boards ?? []) {
        byBoard.set(board.id as string, { open: 0, titles: [] });
      }
      for (const card of cards ?? []) {
        const col = card.board_columns as
          { label?: string } | { label?: string }[] | null;
        const label = Array.isArray(col) ? col[0]?.label : col?.label;
        if (isClosedColumnLabel(label ?? "")) continue;
        const bucket = byBoard.get(card.board_id as string);
        if (!bucket) continue;
        bucket.open += 1;
        if (bucket.titles.length < 5) bucket.titles.push(String(card.titulo));
      }
      crm = (boards ?? [])
        .map((board) => {
          const bucket = byBoard.get(board.id as string);
          return `- ${board.name}: ${bucket?.open ?? 0} abertos${
            bucket?.titles.length ? ` (${bucket.titles.join("; ")})` : ""
          }`;
        })
        .join("\n");
    }
  }

  const calendar = (calendarRes.data ?? []).map((row) => {
    const when = String(row.starts_at).slice(0, 16).replace("T", " ");
    return `- ${when} · ${row.title} (${row.kind})`;
  });

  let listas = "sem listas";
  const listRows = listsRes.data ?? [];
  if (listRows.length > 0) {
    const listIds = listRows.map((row) => row.id as string);
    const { data: items } = await admin
      .from("staff_list_items")
      .select("list_id, title, done, due_on")
      .in("list_id", listIds)
      .eq("done", false)
      .limit(40);
    const byList = new Map<string, string[]>();
    for (const item of items ?? []) {
      const listId = item.list_id as string;
      const current = byList.get(listId) ?? [];
      if (current.length < 4) {
        current.push(
          `${item.title}${item.due_on ? ` (vence ${item.due_on})` : ""}`,
        );
        byList.set(listId, current);
      }
    }
    listas = listRows
      .map((row) => {
        const open = byList.get(row.id as string) ?? [];
        return `- ${row.title}: ${open.length ? open.join("; ") : "vazia"}`;
      })
      .join("\n");
  }

  return [
    `HOJE (Brasília): ${today}`,
    "",
    "CLIENTES:",
    clientes.join("\n") || "- nenhum",
    "",
    "REUNIÕES (7 dias):",
    meetings.join("\n") || "- nenhuma",
    "",
    "CALENDÁRIO INTERNO (7 dias):",
    calendar.join("\n") || "- nenhum horário extra",
    "",
    "PRAZOS (kanban, 7 dias):",
    prazos.join("\n") || "- nenhum",
    "",
    "CRM (listas da Land Grow):",
    crm,
    "",
    "LISTAS DA SALA:",
    listas,
  ].join("\n");
}

const SYSTEM = `Você é o PULSO, o assistente interno da equipe Land Grow, dentro da Sala HQ.
Só a equipe vê esta conversa. Não fale como se fosse para o cliente.
Responda em português do Brasil, curto e concreto.
Use SOMENTE o dossiê operacional abaixo. Se o número, prazo, reunião ou card não estiver lá, diga que não está no PULSO — não invente.
Quando citar, use o título do card, da reunião ou o nome da empresa.
Se pedirem para avisar o cliente, recuse: isso não sai da Sala.`;

export async function answerSalaAgent(
  question: string,
  context: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error:
        "A chave da IA não está configurada. O chat da Sala funciona; o agente não.",
    };
  }
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1200,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `DOSSIÊ OPERACIONAL:\n${context}\n\nPERGUNTA DA EQUIPE:\n${question}`,
        },
      ],
    });
    const text = textFromMessage(response.content);
    if (!text) return { ok: false, error: "O agente não devolveu texto." };
    return { ok: true, text };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha no agente.",
    };
  }
}
