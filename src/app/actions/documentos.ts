"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeOrg, authorizePeriodo } from "@/lib/auth/org-access";

type Result<T> = { success: true; data: T } | { success: false; error: string };

export interface DocumentoTexto {
  id: string;
  periodo: string;
  area: string | null;
  conteudo: string;
  createdAt: string;
}

export interface DocumentoArquivo {
  id: string;
  periodo: string;
  nome: string;
  tipo: string;
  tamanhoBytes: number;
  createdAt: string;
}

/** Tudo que o cliente mandou fora do BIN/MIN (texto livre e arquivos), de todos os períodos. */
export async function listClienteDocumentos(
  orgId: string,
): Promise<Result<{ textos: DocumentoTexto[]; arquivos: DocumentoArquivo[] }>> {
  if (!z.string().uuid().safeParse(orgId).success) {
    return { success: false, error: "Organização inválida" };
  }
  const auth = await authorizeOrg(orgId);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  const { data: cliente } = await admin
    .from("clientes")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();
  if (!cliente) return { success: true, data: { textos: [], arquivos: [] } };

  const { data: periodos } = await admin
    .from("periodos_dados")
    .select("id, mes, ano")
    .eq("cliente_id", cliente.id);
  const label = new Map(
    ((periodos ?? []) as { id: string; mes: number; ano: number }[]).map(
      (p) => [p.id, `${String(p.mes).padStart(2, "0")}/${p.ano}`],
    ),
  );
  const ids = [...label.keys()];
  if (ids.length === 0)
    return { success: true, data: { textos: [], arquivos: [] } };

  const [{ data: textos }, { data: arquivos }] = await Promise.all([
    admin
      .from("colecoes")
      .select("id, periodo_id, payload, created_at")
      .in("periodo_id", ids)
      .eq("tipo", "texto_livre")
      .neq("status", "descartado")
      .order("created_at", { ascending: false }),
    admin
      .from("evidencias")
      .select("id, periodo_id, nome_original, tipo, tamanho_bytes, created_at")
      .in("periodo_id", ids)
      .order("created_at", { ascending: false }),
  ]);

  return {
    success: true,
    data: {
      textos: (
        (textos ?? []) as {
          id: string;
          periodo_id: string;
          payload: { conteudo?: string; area?: string | null } | null;
          created_at: string;
        }[]
      ).map((t) => ({
        id: t.id,
        periodo: label.get(t.periodo_id) ?? "",
        area: t.payload?.area ?? null,
        conteudo: t.payload?.conteudo ?? "",
        createdAt: t.created_at,
      })),
      arquivos: (
        (arquivos ?? []) as {
          id: string;
          periodo_id: string;
          nome_original: string;
          tipo: string;
          tamanho_bytes: number;
          created_at: string;
        }[]
      ).map((a) => ({
        id: a.id,
        periodo: label.get(a.periodo_id) ?? "",
        nome: a.nome_original,
        tipo: a.tipo,
        tamanhoBytes: a.tamanho_bytes,
        createdAt: a.created_at,
      })),
    },
  };
}

/** Link de download de 5 minutos para um arquivo que o usuário pode ver. */
export async function getEvidenciaDownloadUrl(
  evidenciaId: string,
): Promise<Result<{ url: string }>> {
  if (!z.string().uuid().safeParse(evidenciaId).success) {
    return { success: false, error: "Arquivo inválido" };
  }
  const admin = await createAdminClient();
  const { data: evidencia } = await admin
    .from("evidencias")
    .select("periodo_id, storage_path, nome_original")
    .eq("id", evidenciaId)
    .maybeSingle();
  if (!evidencia) return { success: false, error: "Arquivo não encontrado" };

  const auth = await authorizePeriodo(evidencia.periodo_id as string);
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await admin.storage
    .from("evidencias")
    .createSignedUrl(evidencia.storage_path as string, 300, {
      download: evidencia.nome_original as string,
    });
  if (error || !data) {
    return { success: false, error: error?.message ?? "Não gerei o link" };
  }
  return { success: true, data: { url: data.signedUrl } };
}
