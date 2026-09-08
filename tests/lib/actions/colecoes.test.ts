import { describe, it, expect } from "vitest";
import { z } from "zod";

// Mesmo padrão de tests/lib/actions/periods.test.ts e tests/lib/actions/evidencias.test.ts:
// os schemas são internos a colecoes.ts / revisions.ts ("use server"), então recriamos
// aqui a partir do que a action espera, sem mockar o Supabase.

const restoreColecaoSchema = z.object({
  colecaoId: z.string().uuid("ID de coleção inválido"),
  revNumber: z.number().int().positive("Número de revisão inválido"),
});

const listRevisionsSchema = z.object({
  periodoId: z.string().uuid("ID de período inválido"),
});

describe("restoreColecaoSchema", () => {
  const valid = {
    colecaoId: "00000000-0000-0000-0000-000000000001",
    revNumber: 3,
  };

  it("aceita um payload válido", () => {
    expect(restoreColecaoSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects colecaoId que não é uuid", () => {
    expect(
      restoreColecaoSchema.safeParse({ ...valid, colecaoId: "123" }).success,
    ).toBe(false);
  });

  it("rejects revNumber zero ou negativo", () => {
    expect(
      restoreColecaoSchema.safeParse({ ...valid, revNumber: 0 }).success,
    ).toBe(false);
    expect(
      restoreColecaoSchema.safeParse({ ...valid, revNumber: -1 }).success,
    ).toBe(false);
  });

  it("rejects revNumber não inteiro", () => {
    expect(
      restoreColecaoSchema.safeParse({ ...valid, revNumber: 1.5 }).success,
    ).toBe(false);
  });
});

describe("listRevisionsSchema", () => {
  it("aceita um periodoId válido", () => {
    expect(
      listRevisionsSchema.safeParse({
        periodoId: "00000000-0000-0000-0000-000000000001",
      }).success,
    ).toBe(true);
  });

  it("rejects periodoId que não é uuid", () => {
    expect(
      listRevisionsSchema.safeParse({ periodoId: "nao-e-uuid" }).success,
    ).toBe(false);
  });
});
