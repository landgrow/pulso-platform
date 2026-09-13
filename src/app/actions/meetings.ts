"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem, Meeting } from "@/types/meetings";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const orgIdSchema = z.object({
  orgId: z.string().uuid("Organização inválida"),
});

const createMeetingSchema = z.object({
  orgId: z.string().uuid(),
  titulo: z.string().min(1, "Título é obrigatório"),
  data: z.string().min(1, "Data é obrigatória"),
  participantes: z.array(z.string()).default([]),
  resumo: z.string().optional(),
  topicos: z.string().optional(),
});

const toggleChecklistSchema = z.object({
  meetingId: z.string().uuid(),
  itemId: z.string().optional(),
  texto: z.string().optional(),
  removeId: z.string().optional(),
});

const MEETING_SELECT =
  "id, org_id, titulo, data, participantes, resumo, topicos, checklist, created_at";

export async function listMeetings(orgId: string): Promise<Result<Meeting[]>> {
  const parsed = orgIdSchema.safeParse({ orgId });
  if (!parsed.success) return { success: false, error: "Organização inválida" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(MEETING_SELECT)
    .eq("org_id", orgId)
    .order("data", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Meeting[] };
}

export async function createMeeting(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = createMeetingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const {
    orgId,
    titulo,
    data: dataReuniao,
    participantes,
    resumo,
    topicos,
  } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      org_id: orgId,
      titulo,
      data: dataReuniao,
      participantes,
      resumo: resumo || null,
      topicos: topicos || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data)
    return { success: false, error: error?.message ?? "Erro ao criar reunião" };
  revalidatePath("/admin/atividades");
  return { success: true, data: { id: data.id } };
}

export async function deleteMeeting(
  meetingId: string,
): Promise<Result<{ removed: true }>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", meetingId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  return { success: true, data: { removed: true } };
}

/** Alterna (ou adiciona/remove) um item do checklist de atividades da reunião. */
export async function toggleChecklistItem(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = toggleChecklistSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { meetingId, itemId, texto, removeId } = parsed.data;
  const supabase = await createClient();

  const { data: meeting, error: fetchError } = await supabase
    .from("meetings")
    .select("checklist")
    .eq("id", meetingId)
    .single();
  if (fetchError || !meeting)
    return {
      success: false,
      error: fetchError?.message ?? "Reunião não encontrada",
    };

  let checklist = (meeting.checklist ?? []) as ChecklistItem[];
  if (removeId) {
    checklist = checklist.filter((c) => c.id !== removeId);
  } else if (itemId) {
    checklist = checklist.map((c) =>
      c.id === itemId ? { ...c, done: !c.done } : c,
    );
  } else if (texto) {
    checklist = [...checklist, { id: randomUUID(), texto, done: false }];
  }

  const { error } = await supabase
    .from("meetings")
    .update({ checklist })
    .eq("id", meetingId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  return { success: true, data: { id: meetingId } };
}
