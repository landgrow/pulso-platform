"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeOrg, type OrgAccess } from "@/lib/auth/org-access";
import { buildMindMapTemplate } from "@/lib/mindmap-templates";
import type { MindMap, MindMapNode, MindMapSummary } from "@/types/mindmaps";

type Result<T> = { success: true; data: T } | { success: false; error: string };
type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

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
  layout: z.enum(["radial", "columns", "quadrant", "canvas-grid"]).optional(),
});

const mindMapIdSchema = z.object({ mindMapId: z.string().uuid() });

/** Resolve a org dona do mapa (via admin) e autoriza o usuário nela. */
async function authorizeMindMap(
  mindMapId: string,
  opts: { write?: boolean } = {},
): Promise<
  | { ok: true; admin: AdminClient; access: OrgAccess }
  | { ok: false; error: string }
> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("mind_maps")
    .select("org_id")
    .eq("id", mindMapId)
    .maybeSingle();
  if (!data?.org_id) return { ok: false, error: "Mapa não encontrado" };
  const auth = await authorizeOrg(data.org_id as string, opts);
  if (!auth.ok) return auth;
  return { ok: true, admin, access: auth.access };
}

export async function listMindMaps(
  orgId: string,
): Promise<Result<MindMapSummary[]>> {
  const parsed = orgIdSchema.safeParse({ orgId });
  if (!parsed.success) return { success: false, error: "Organização inválida" };

  const auth = await authorizeOrg(parsed.data.orgId);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("mind_maps")
    .select("id, name, updated_at")
    .eq("org_id", parsed.data.orgId)
    .order("updated_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as MindMapSummary[] };
}

export async function getMindMap(mindMapId: string): Promise<Result<MindMap>> {
  const parsed = mindMapIdSchema.safeParse({ mindMapId });
  if (!parsed.success) return { success: false, error: "Mapa inválido" };

  const auth = await authorizeMindMap(parsed.data.mindMapId);
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.admin
    .from("mind_maps")
    .select("id, org_id, name, tree, layout")
    .eq("id", parsed.data.mindMapId)
    .single();

  if (error || !data)
    return { success: false, error: error?.message ?? "Mapa não encontrado" };
  return {
    success: true,
    data: {
      ...(data as MindMap),
      layout: (["radial", "columns", "quadrant", "canvas-grid"].includes(
        data.layout as string,
      )
        ? data.layout
        : "radial") as MindMap["layout"],
    },
  };
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

  const auth = await authorizeOrg(orgId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };

  const { tree, layout } = buildMindMapTemplate(templateKey);
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("mind_maps")
    .insert({
      org_id: orgId,
      name: name ?? tree.text,
      tree,
      layout,
      created_by: auth.access.user.id,
    })
    .select("id")
    .single();

  if (error || !data)
    return { success: false, error: error?.message ?? "Erro ao criar mapa" };
  revalidatePath("/admin/mapa-mental");
  return { success: true, data: { id: data.id as string } };
}

/** Substitui a árvore inteira — mesma semântica do mmSave() do protótipo. */
export async function saveMindMapTree(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = saveTreeSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };
  const { mindMapId, tree, layout } = parsed.data;

  const auth = await authorizeMindMap(mindMapId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.admin
    .from("mind_maps")
    .update(layout ? { tree, layout } : { tree })
    .eq("id", mindMapId)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
  revalidatePath("/admin/mapa-mental");
  return { success: true, data: { id: mindMapId } };
}

export async function deleteMindMap(
  mindMapId: string,
): Promise<Result<{ removed: true }>> {
  const parsed = mindMapIdSchema.safeParse({ mindMapId });
  if (!parsed.success) return { success: false, error: "Mapa inválido" };

  const auth = await authorizeMindMap(parsed.data.mindMapId, { write: true });
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.admin
    .from("mind_maps")
    .delete()
    .eq("id", parsed.data.mindMapId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0)
    return { success: false, error: "Não encontrado" };
  revalidatePath("/admin/mapa-mental");
  return { success: true, data: { removed: true } };
}
