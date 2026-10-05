"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeOrg, type OrgAccess } from "@/lib/auth/org-access";
import type { ChecklistItem, Meeting, MeetingGuest } from "@/types/meetings";
import { listOrgAssignees } from "@/lib/boards/assignees";
import {
  sendInvites,
  type InviteMeeting,
  type SendSummary,
} from "@/lib/meetings/send-invites";
import {
  meetingFromRow,
  promoteMeetingChecklist,
} from "@/lib/meetings/promote-checklist";

type Result<T> = { success: true; data: T } | { success: false; error: string };
type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

const orgIdSchema = z.object({
  orgId: z.string().uuid("Organização inválida"),
});

const MAX_GUESTS = 20;

const guestSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail de convidado inválido"),
  nome: z.string().trim().max(120).default(""),
});

const createMeetingSchema = z.object({
  orgId: z.string().uuid(),
  titulo: z.string().min(1, "Título é obrigatório"),
  data: z.string().min(1, "Data é obrigatória"),
  participantes: z.array(z.string()).default([]),
  resumo: z.string().optional(),
  topicos: z.string().optional(),
  horaInicio: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido")
    .optional(),
  duracaoMin: z.number().int().min(5).max(720).default(60),
  link: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => v === "" || /^https?:\/\//i.test(v),
      "O link deve começar com http:// ou https://",
    )
    .optional(),
  convidados: z
    .array(guestSchema)
    .max(MAX_GUESTS, `No máximo ${MAX_GUESTS} convidados`)
    .default([]),
  enviarConvite: z.boolean().default(true),
});

const toggleChecklistSchema = z.object({
  meetingId: z.string().uuid(),
  itemId: z.string().optional(),
  texto: z.string().optional(),
  removeId: z.string().optional(),
});

const meetingIdSchema = z.string().uuid();

// "*" para continuar funcionando antes de a migração 0035 (horário/convidados)
// ser aplicada no banco.
const MEETING_SELECT = "*";

export type InviteResult = {
  sent: number;
  failed: number;
  skipped: number;
  firstError: string | null;
};

function organizerOf(access: OrgAccess): MeetingGuest {
  const user = access.user;
  const nome =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Land Grow";
  return { email: user.email ?? "", nome };
}

function toInviteMeeting(row: Record<string, unknown>): InviteMeeting | null {
  const hora = row.hora_inicio;
  const convidados = (row.convidados ?? []) as MeetingGuest[];
  if (typeof hora !== "string" || convidados.length === 0) return null;
  return {
    id: row.id as string,
    titulo: row.titulo as string,
    data: String(row.data).slice(0, 10),
    hora_inicio: hora,
    duracao_min: (row.duracao_min as number | null) ?? 60,
    link: (row.link as string | null) ?? null,
    resumo: (row.resumo as string | null) ?? null,
    convidados,
    ics_sequence: (row.ics_sequence as number | null) ?? 0,
  };
}

function toResult(summary: SendSummary): InviteResult {
  return { ...summary };
}

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
): Promise<Result<{ id: string; invites: InviteResult | null }>> {
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
    horaInicio,
    duracaoMin,
    link,
    enviarConvite,
  } = parsed.data;
  // Sem repetir o mesmo e-mail duas vezes.
  const convidados = [
    ...new Map(parsed.data.convidados.map((g) => [g.email, g])).values(),
  ];

  if (convidados.length > 0 && !horaInicio) {
    return {
      success: false,
      error: "Informe o horário para poder convidar participantes.",
    };
  }

  const auth = await authorizeOrg(orgId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Cliente só convida quem é da própria empresa ou da Land Grow: sem isso
  // qualquer pessoa mandaria e-mail pelo nosso domínio para endereços de fora.
  if (convidados.length > 0 && auth.access.platformRole === null) {
    const allowed = new Set(
      (await listOrgAssignees(admin, orgId))
        .map((a) => a.email?.toLowerCase())
        .filter((e): e is string => Boolean(e)),
    );
    if (convidados.some((g) => !allowed.has(g.email))) {
      return {
        success: false,
        error:
          "Você só pode convidar pessoas da sua empresa ou da Land Grow. Para convidar outro e-mail, peça à Land Grow.",
      };
    }
  }

  const { data, error } = await admin
    .from("meetings")
    .insert({
      org_id: orgId,
      titulo,
      data: dataReuniao,
      participantes:
        participantes.length > 0
          ? participantes
          : convidados.map((g) => g.nome || g.email),
      resumo: resumo || null,
      topicos: topicos || null,
      created_by: auth.access.user.id,
      ...(horaInicio
        ? {
            hora_inicio: horaInicio,
            duracao_min: duracaoMin,
            link: link || null,
            convidados,
          }
        : {}),
    })
    .select("*")
    .single();

  if (error || !data)
    return { success: false, error: error?.message ?? "Erro ao criar reunião" };

  let invites: InviteResult | null = null;
  const meeting = toInviteMeeting(data as Record<string, unknown>);
  if (meeting && enviarConvite) {
    invites = toResult(
      await sendInvites(meeting, "REQUEST", organizerOf(auth.access)),
    );
    if (invites.sent > 0) {
      await admin
        .from("meetings")
        .update({ convite_enviado_at: new Date().toISOString() })
        .eq("id", meeting.id);
    }
  }

  revalidatePath("/admin/atividades");
  revalidatePath("/admin/reunioes");
  return { success: true, data: { id: data.id as string, invites } };
}

/** Reenvia o convite (a agenda de quem já aceitou é atualizada, não duplicada). */
export async function resendMeetingInvites(
  meetingId: string,
): Promise<Result<InviteResult>> {
  const parsed = meetingIdSchema.safeParse(meetingId);
  if (!parsed.success) return { success: false, error: "Reunião inválida" };

  const auth = await authorizeMeeting(parsed.data, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };

  const { data: row } = await auth.admin
    .from("meetings")
    .select("*")
    .eq("id", parsed.data)
    .maybeSingle();
  const meeting = row ? toInviteMeeting(row as Record<string, unknown>) : null;
  if (!meeting) {
    return {
      success: false,
      error: "Esta reunião não tem horário e convidados para enviar.",
    };
  }

  const next = { ...meeting, ics_sequence: meeting.ics_sequence + 1 };
  const summary = await sendInvites(next, "REQUEST", organizerOf(auth.access), {
    update: true,
  });
  if (summary.sent > 0) {
    await auth.admin
      .from("meetings")
      .update({
        ics_sequence: next.ics_sequence,
        convite_enviado_at: new Date().toISOString(),
      })
      .eq("id", parsed.data);
  }
  revalidatePath("/admin/reunioes");
  return { success: true, data: toResult(summary) };
}

export async function deleteMeeting(
  meetingId: string,
): Promise<Result<{ removed: true }>> {
  const parsed = meetingIdSchema.safeParse(meetingId);
  if (!parsed.success) return { success: false, error: "Reunião inválida" };

  const auth = await authorizeMeeting(parsed.data, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };

  // Já tinha convite na agenda das pessoas: avisa o cancelamento antes de apagar.
  const { data: existing } = await auth.admin
    .from("meetings")
    .select("*")
    .eq("id", parsed.data)
    .maybeSingle();
  const inviteMeeting = existing
    ? toInviteMeeting(existing as Record<string, unknown>)
    : null;
  if (
    inviteMeeting &&
    (existing as Record<string, unknown>).convite_enviado_at
  ) {
    await sendInvites(
      { ...inviteMeeting, ics_sequence: inviteMeeting.ics_sequence + 1 },
      "CANCEL",
      organizerOf(auth.access),
    );
  }

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
