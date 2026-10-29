"use server";

import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { isClosedColumnLabel } from "@/lib/boards/plano-de-acao-template";
import {
  buildWorkGraph,
  type WorkGraphData,
  type WorkGraphMeetingInput,
  type WorkGraphTaskInput,
} from "@/lib/trabalho/graph";
import type { ChecklistItem } from "@/types/meetings";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const MEETING_LIMIT = 80;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type OrgEmbed = {
  name: string;
  slug: string;
  is_internal: boolean | null;
};

type MeetingRow = {
  id: string;
  titulo: string;
  data: string;
  checklist: ChecklistItem[] | null;
  organizations: OrgEmbed | OrgEmbed[] | null;
};

type CardRow = {
  id: string;
  titulo: string;
  prazo: string | null;
  source_meeting_id: string | null;
  source_checklist_item_id: string | null;
  board_columns: { label: string } | { label: string }[] | null;
  boards:
    | {
        module: string;
        organizations: OrgEmbed | OrgEmbed[] | null;
      }
    | {
        module: string;
        organizations: OrgEmbed | OrgEmbed[] | null;
      }[]
    | null;
  related_org: { name: string } | { name: string }[] | null;
  profiles:
    { full_name: string | null } | { full_name: string | null }[] | null;
};

function meetingInput(row: MeetingRow): WorkGraphMeetingInput | null {
  const org = one(row.organizations);
  if (!org) return null;
  return {
    id: row.id,
    titulo: row.titulo,
    data: String(row.data).slice(0, 10),
    orgName: org.name,
    orgSlug: org.slug,
    isInternal: Boolean(org.is_internal),
    checklist: row.checklist ?? [],
  };
}

function cardInput(row: CardRow): WorkGraphTaskInput | null {
  const board = one(row.boards);
  const org = one(board?.organizations);
  const column = one(row.board_columns);
  if (!org || !column) return null;
  if (board && board.module !== "atividades") return null;
  const related = one(row.related_org);
  const profile = one(row.profiles);
  return {
    id: row.id,
    titulo: row.titulo,
    columnLabel: column.label,
    prazo: row.prazo,
    sourceMeetingId: row.source_meeting_id,
    sourceChecklistItemId: row.source_checklist_item_id,
    orgName: org.name,
    orgSlug: org.slug,
    isInternal: Boolean(org.is_internal),
    relatedOrgName: related?.name ?? null,
    responsavelNome: profile?.full_name ?? null,
  };
}

export async function listWorkGraph(): Promise<Result<WorkGraphData>> {
  const supabase = await createClient();
  try {
    await requireCapability(supabase, "atividades");
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Acesso negado",
    };
  }

  const meetingsQuery = await supabase
    .from("meetings")
    .select(
      "id, titulo, data, checklist, organizations!inner(name, slug, is_internal)",
    )
    .order("data", { ascending: false })
    .limit(MEETING_LIMIT);

  if (meetingsQuery.error) {
    return { success: false, error: meetingsQuery.error.message };
  }

  const meetings = ((meetingsQuery.data ?? []) as unknown as MeetingRow[])
    .map(meetingInput)
    .filter((row): row is WorkGraphMeetingInput => row !== null);

  const meetingIds = meetings.map((row) => row.id);

  const cardsQuery = await supabase
    .from("board_cards")
    .select(
      "id, titulo, prazo, source_meeting_id, source_checklist_item_id, board_columns!inner(label), boards!inner(module, organizations!inner(name, slug, is_internal)), related_org:organizations!board_cards_related_org_id_fkey(name), profiles!board_cards_responsavel_id_fkey(full_name)",
    )
    .eq("boards.module", "atividades");

  if (cardsQuery.error) {
    return { success: false, error: cardsQuery.error.message };
  }

  const meetingSet = new Set(meetingIds);
  const cards = ((cardsQuery.data ?? []) as unknown as CardRow[])
    .map(cardInput)
    .filter((row): row is WorkGraphTaskInput => row !== null)
    .filter((row) => {
      if (row.sourceMeetingId && meetingSet.has(row.sourceMeetingId)) {
        return true;
      }
      return (
        row.sourceMeetingId === null && !isClosedColumnLabel(row.columnLabel)
      );
    });

  return { success: true, data: buildWorkGraph({ meetings, cards }) };
}
