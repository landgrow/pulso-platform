"use server";

import { z } from "zod";
// zodOutputFormat() requires schemas built with the zod/v4 subpath (bundled in zod 3.25+),
// not the project's regular top-level "zod" (v3 API) import used everywhere else.
import * as z4 from "zod/v4";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import type { MindMapNode } from "@/types/mindmaps";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const generateSchema = z.object({
  orgId: z.string().uuid(),
  text: z.string().min(1, "Cole um texto pra gerar o mapa"),
});

const GeneratedMapSchema = z4.object({
  title: z4.string(),
  layout: z4.enum(["columns", "quadrant", "canvas-grid"]),
  columns: z4
    .array(
      z4.object({
        text: z4.string(),
        items: z4.array(z4.string()).max(12),
      }),
    )
    .min(1)
    .max(8),
});

const PALETTE = [
  "#3b82f6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
];

/** Converte um texto livre num mapa mental estruturado via Claude — mesmo recurso "✨ Gerar com IA" do protótipo. */
export async function generateMindMapFromText(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = generateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }
  const { orgId, text } = parsed.data;

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      success: false,
      error:
        "ANTHROPIC_API_KEY não configurada no .env.local — peça pra Nayara adicionar a chave.",
    };
  }

  const client = new Anthropic();

  let generated: z4.infer<typeof GeneratedMapSchema>;
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4096,
      system:
        "Você organiza texto livre em um mapa mental estruturado, no mesmo estilo de frameworks de negócio " +
        "(colunas ou quadrantes). Escolha o layout mais adequado ao conteúdo: 'quadrant' só quando o texto " +
        "descreve claramente 4 categorias em pares opostos (tipo análise SWOT ou matriz de decisão); " +
        "'canvas-grid' quando há 5 ou mais blocos de categoria; 'columns' pra sequências ou poucas categorias " +
        "lado a lado (padrão). No máximo 8 colunas, no máximo 12 itens por coluna. Cada item é uma frase curta " +
        "de texto, sem sub-itens.",
      messages: [{ role: "user", content: text }],
      output_config: { format: zodOutputFormat(GeneratedMapSchema) },
    });
    if (!response.parsed_output) {
      return {
        success: false,
        error: "Não consegui estruturar esse texto. Tente reformular.",
      };
    }
    generated = response.parsed_output;
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro ao chamar a IA",
    };
  }

  const tree: MindMapNode = {
    id: randomUUID(),
    text: generated.title,
    color: "#27272a",
    children: generated.columns.map((col, i) => {
      const color = PALETTE[i % PALETTE.length] ?? "#3b82f6";
      return {
        id: randomUUID(),
        text: col.text,
        color,
        children: col.items.map((item) => ({
          id: randomUUID(),
          text: item,
          color,
          children: [],
        })),
      };
    }),
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("mind_maps")
    .insert({
      org_id: orgId,
      name: generated.title,
      tree,
      layout: generated.layout,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data)
    return { success: false, error: error?.message ?? "Erro ao criar mapa" };
  revalidatePath("/admin/mapa-mental");
  return { success: true, data: { id: data.id } };
}
