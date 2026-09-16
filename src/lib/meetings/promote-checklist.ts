import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChecklistItem, Meeting } from "@/types/meetings";
import { isLandGrowDeliverable } from "@/lib/meetings/land-grow-filter";
import {
  findDoneColumnId,
  findTodoColumnId,
} from "@/lib/boards/plano-de-acao-template";

type PromoteResult = {
  created: number;
  skippedClientOps: number;
  skippedExisting: number;
  moved: number;
};

async function firstAtividadesBoard(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from("boards")
    .select("id")
    .eq("org_id", orgId)
    .eq("module", "atividades")
    .eq("kind", "standard")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

async function boardColumns(
  supabase: SupabaseClient,
  boardId: string,
): Promise<{ id: string; label: string }[]> {
  const { data } = await supabase
    .from("board_columns")
    .select("id, label")
    .eq("board_id", boardId)
    .order("position", { ascending: true });
  return data ?? [];
}

export async function promoteMeetingChecklist(
  supabase: SupabaseClient,
  meeting: Pick<Meeting, "id" | "org_id" | "titulo" | "data" | "checklist">,
  createdBy: string | null,
): Promise<PromoteResult> {
  const result: PromoteResult = {
    created: 0,
    skippedClientOps: 0,
    skippedExisting: 0,
    moved: 0,
  };

  const board = await firstAtividadesBoard(supabase, meeting.org_id);
  if (!board) return result;
  const columns = await boardColumns(supabase, board.id);
  const todoId = findTodoColumnId(columns);
  const doneId = findDoneColumnId(columns);
  if (!todoId) return result;

  for (const item of meeting.checklist) {
    if (!isLandGrowDeliverable(item.texto)) {
      result.skippedClientOps += 1;
      continue;
    }

    const { data: existing } = await supabase
      .from("board_cards")
      .select("id, column_id")
      .eq("source_checklist_item_id", item.id)
      .maybeSingle();

    if (existing) {
      result.skippedExisting += 1;
      const target = item.done ? doneId : todoId;
      if (target && existing.column_id !== target) {
        await supabase
          .from("board_cards")
          .update({ column_id: target })
          .eq("id", existing.id);
        result.moved += 1;
      }
      continue;
    }

    const { count } = await supabase
      .from("board_cards")
      .select("id", { count: "exact", head: true })
      .eq("column_id", item.done ? (doneId ?? todoId) : todoId);

    const { error } = await supabase.from("board_cards").insert({
      board_id: board.id,
      column_id: item.done ? (doneId ?? todoId) : todoId,
      titulo: item.texto.trim(),
      position: count ?? 0,
      created_by: createdBy,
      source_meeting_id: meeting.id,
      source_checklist_item_id: item.id,
      observacoes: `Da reunião “${meeting.titulo}” em ${meeting.data.slice(0, 10)}.`,
    });
    if (!error) result.created += 1;
  }

  return result;
}

export function meetingFromRow(row: {
  id: string;
  org_id: string;
  titulo: string;
  data: string;
  checklist: ChecklistItem[] | null;
}): Pick<Meeting, "id" | "org_id" | "titulo" | "data" | "checklist"> {
  return {
    id: row.id,
    org_id: row.org_id,
    titulo: row.titulo,
    data: row.data,
    checklist: row.checklist ?? [],
  };
}
