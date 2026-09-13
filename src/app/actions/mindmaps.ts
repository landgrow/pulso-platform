"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildMindMapTemplate } from "@/lib/mindmap-templates";
import type { MindMap, MindMapNode, MindMapSummary } from "@/types/mindmaps";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const orgIdSchema = z.object({
  orgId: z.string().uuid("Organização inválida"),
});

const createMindMapSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório").optional(),
  templateKey: z.string().default("em-branco"),
});

const saveTreeSchema = z.object({
  mindMapId: z.string().uuid(),
  tree: z.custom<MindMapNode>((v) => typeof v === "object" && v !== null),
});

const mindMapIdSchema = z.object({ mindMapId: z.string().uuid() });

export async function listMindMaps(
  orgId: string,
): Promise<Result<MindMapSummary[]>> {
  const parsed = orgIdSchema.safeParse({ orgId });
  if (!parsed.success) return { success: false, error: "Organização inválida" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mind_maps")
    .select("id, name, updated_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function getMindMap(mindMapId: string): Promise<Result<MindMap>> {
  const parsed = mindMapIdSchema.safeParse({ mindMapId });
  if (!parsed.success) return { success: false, error: "Mapa inválido" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mind_maps")
    .select("id, org_id, name, tree, layout")
    .eq("id", mindMapId)
    .single();

  if (error || !data)
    return { success: false, error: error?.message ?? "Mapa não encontrado" };
  return { success: true, data: data as MindMap };
}

/** Cria um mapa novo pra org a partir de um template (mesmos 8 do protótipo — "em-branco" é o padrão). */
export async function createMindMap(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = createMindMapSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { orgId, name, templateKey } = parsed.data;
  const { tree, layout } = buildMindMapTemplate(templateKey);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("mind_maps")
    .insert({
      org_id: orgId,
      name: name ?? tree.text,
      tree,
      layout,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data)
    return { success: false, error: error?.message ?? "Erro ao criar mapa" };
  revalidatePath("/admin/mapa-mental");
  return { success: true, data: { id: data.id } };
}

/** Substitui a árvore inteira — mesma semântica do mmSave() do protótipo. */
export async function saveMindMapTree(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = saveTreeSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { mindMapId, tree } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("mind_maps")
    .update({ tree })
    .eq("id", mindMapId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/mapa-mental");
  return { success: true, data: { id: mindMapId } };
}

export async function deleteMindMap(
  mindMapId: string,
): Promise<Result<{ removed: true }>> {
  const parsed = mindMapIdSchema.safeParse({ mindMapId });
  if (!parsed.success) return { success: false, error: "Mapa inválido" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("mind_maps")
    .delete()
    .eq("id", mindMapId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/mapa-mental");
  return { success: true, data: { removed: true } };
}
