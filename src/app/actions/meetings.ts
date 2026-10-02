"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeOrg, type OrgAccess } from "@/lib/auth/org-access";
import type { ChecklistItem, Meeting } from "@/types/meetings";
import {
  meetingFromRow,
  promoteMeetingChecklist,
} from "@/lib/meetings/promote-checklist";

type Result<T> = { success: true; data: T } | { success: false; error: string };
type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

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

const meetingIdSchema = z.string().uuid();

const MEETING_SELECT =
  "id, org_id, titulo, data, participantes, resumo, topicos, checklist, created_at";

/** Resolve a org dona da reunião (via admin) e autoriza o usuário nela. */
async function authorizeMeeting(
  meetingId: string,
  opts: { write?: boolean } = {},
): Promise<
  | { ok: true; admin: AdminClient; access: OrgAccess }
  | { ok: false; error: string }
> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("meetings")
    .select("org_id")
    .eq("id", meetingId)
    .maybeSingle();
  if (!data?.org_id) return { ok: false, error: "Reunião não encontrada" };
  const auth = await authorizeOrg(data.org_id as string, opts);
  if (!auth.ok) return auth;
  return { ok: true, admin, access: auth.access };
}

export async function listMeetings(orgId: string): Promise<Result<Meeting[]>> {
  const parsed = orgIdSchema.safeParse({ orgId });
  if (!parsed.success) return { success: false, error: "Organização inválida" };

  const auth = await authorizeOrg(parsed.data.orgId);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("meetings")
    .select(MEETING_SELECT)
    .eq("org_id", parsed.data.orgId)
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

  const auth = await authorizeOrg(orgId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("meetings")
    .insert({
      org_id: orgId,
      titulo,
      data: dataReuniao,
      participantes,
      resumo: resumo || null,
      topicos: topicos || null,
      created_by: auth.access.user.id,
    })
    .select("id")
    .single();

  if (error || !data)
    return { success: false, error: error?.message ?? "Erro ao criar reunião" };
  revalidatePath("/admin/atividades");
  return { success: true, data: { id: data.id as string } };
}

export async function deleteMeeting(
  meetingId: string,
): Promise<Result<{ removed: true }>> {
  const parsed = meetingIdSchema.safeParse(meetingId);
  if (!parsed.success) return { success: false, error: "Reunião inválida" };

  const auth = await authorizeMeeting(parsed.data, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.admin
    .from("meetings")
    .delete()
    .eq("id", parsed.data)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
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

  const auth = await authorizeMeeting(meetingId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };
  const { admin } = auth;

  const { data: meeting, error: fetchError } = await admin
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

  const { data: updated, error } = await admin
    .from("meetings")
    .update({ checklist })
    .eq("id", meetingId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!updated || updated.length === 0)
    return { success: false, error: "Não encontrado" };

  const { data: full } = await admin
    .from("meetings")
    .select("id, org_id, titulo, data, checklist")
    .eq("id", meetingId)
    .single();
  if (full) {
    await promoteMeetingChecklist(
      admin,
      meetingFromRow(full as Parameters<typeof meetingFromRow>[0]),
      auth.access.user.id,
    );
  }

  revalidatePath("/admin/atividades");
  return { success: true, data: { id: meetingId } };
}

export async function generateCardsFromMeeting(
  meetingId: string,
): Promise<Result<{ created: number; skippedClientOps: number }>> {
  const parsed = meetingIdSchema.safeParse(meetingId);
  if (!parsed.success) return { success: false, error: "Reunião inválida" };

  const auth = await authorizeMeeting(parsed.data, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };

  const { data: full, error } = await auth.admin
    .from("meetings")
    .select("id, org_id, titulo, data, checklist")
    .eq("id", parsed.data)
    .single();
  if (error || !full) {
    return {
      success: false,
      error: error?.message ?? "Reunião não encontrada",
    };
  }
  const result = await promoteMeetingChecklist(
    auth.admin,
    meetingFromRow(full as Parameters<typeof meetingFromRow>[0]),
    auth.access.user.id,
  );
  revalidatePath("/admin/atividades");
  return {
    success: true,
    data: {
      created: result.created,
      skippedClientOps: result.skippedClientOps,
    },
  };
}
