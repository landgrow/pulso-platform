import { z } from "zod";

/**
 * As mesmas 6 áreas do formulário estruturado (src/lib/formulario-questions.ts)
 * + "Geral" para observações que não pertencem a uma área específica.
 */
export const TEXTO_AREAS = [
  "Financeiro",
  "Operacional",
  "Comercial",
  "Pessoas",
  "Estratégico",
  "Marketing",
  "Geral",
] as const;

export type TextoArea = (typeof TEXTO_AREAS)[number];

export const createTextoLivreSchema = z.object({
  periodoId: z.string().uuid("ID de período inválido"),
  conteudo: z
    .string()
    .min(10, "Escreva pelo menos 10 caracteres")
    .max(10_000, "Máximo de 10.000 caracteres"),
  area: z.enum(TEXTO_AREAS),
});

export const updateTextoLivreSchema = z.object({
  colecaoId: z.string().uuid("ID inválido"),
  conteudo: z
    .string()
    .min(10, "Escreva pelo menos 10 caracteres")
    .max(10_000, "Máximo de 10.000 caracteres"),
  area: z.enum(TEXTO_AREAS),
});

export const listTextoLivreSchema = z.object({
  periodoId: z.string().uuid("ID de período inválido"),
});

export interface TextoLivrePayload {
  conteudo: string;
  area: TextoArea;
}
