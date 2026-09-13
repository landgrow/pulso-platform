"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Ritual } from "@/types/rituals";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const RITUAL_TIPOS = ["standup", "weekly", "resultado"] as const;

const listSchema = z.object({
  orgId: z.string().uuid(),
  tipo: z.enum(RITUAL_TIPOS),
});

const createSchema = z.object({
  orgId: z.string().uuid(),
  tipo: z.enum(RITUAL_TIPOS),
  data: z.string().min(1, "Data é obrigatória"),
  participantes: z.array(z.string()).default([]),
  notas: z.string().optional(),
});

const RITUAL_SELECT =
  "id, org_id, tipo, data, participantes, notas, created_at";

export async function listRituals(raw: unknown): Promise<Result<Ritual[]>> {
  const parsed = listSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { orgId, tipo } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rituals")
    .select(RITUAL_SELECT)
    .eq("org_id", orgId)
    .eq("tipo", tipo)
    .order("data", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Ritual[] };
}

export async function createRitual(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { orgId, tipo, data: dataRitual, participantes, notas } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("rituals")
    .insert({
      org_id: orgId,
      tipo,
      data: dataRitual,
      participantes,
      notas: notas || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data)
    return {
      success: false,
      error: error?.message ?? "Erro ao criar registro",
    };
  revalidatePath("/admin/atividades");
  return { success: true, data: { id: data.id } };
}

export async function deleteRitual(
  ritualId: string,
): Promise<Result<{ removed: true }>> {
  const supabase = await createClient();
  const { error } = await supabase.from("rituals").delete().eq("id", ritualId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/atividades");
  return { success: true, data: { removed: true } };
}
