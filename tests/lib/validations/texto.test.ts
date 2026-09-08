import { describe, it, expect } from "vitest";
import {
  createTextoLivreSchema,
  updateTextoLivreSchema,
  listTextoLivreSchema,
  TEXTO_AREAS,
} from "@/lib/validations/texto";

const validCreate = {
  periodoId: "00000000-0000-0000-0000-000000000001",
  conteudo: "Este é um texto de observação com mais de dez caracteres.",
  area: "Financeiro" as const,
};

describe("createTextoLivreSchema", () => {
  it("aceita um payload completo e válido", () => {
    expect(createTextoLivreSchema.safeParse(validCreate).success).toBe(true);
  });

  it("aceita qualquer uma das 7 áreas", () => {
    for (const area of TEXTO_AREAS) {
      expect(
        createTextoLivreSchema.safeParse({ ...validCreate, area }).success,
      ).toBe(true);
    }
  });

  it("rejects área fora do enum permitido", () => {
    expect(
      createTextoLivreSchema.safeParse({ ...validCreate, area: "Jurídico" })
        .success,
    ).toBe(false);
  });

  it("rejects periodoId que não é uuid", () => {
    expect(
      createTextoLivreSchema.safeParse({
        ...validCreate,
        periodoId: "nao-e-uuid",
      }).success,
    ).toBe(false);
  });

  it("rejects conteúdo com menos de 10 caracteres", () => {
    expect(
      createTextoLivreSchema.safeParse({ ...validCreate, conteudo: "curto" })
        .success,
    ).toBe(false);
  });

  it("rejects conteúdo acima de 10.000 caracteres", () => {
    expect(
      createTextoLivreSchema.safeParse({
        ...validCreate,
        conteudo: "a".repeat(10_001),
      }).success,
    ).toBe(false);
  });

  it("aceita conteúdo exatamente no limite de 10.000 caracteres", () => {
    expect(
      createTextoLivreSchema.safeParse({
        ...validCreate,
        conteudo: "a".repeat(10_000),
      }).success,
    ).toBe(true);
  });

  it("rejects quando falta um campo obrigatório", () => {
    const rest: Record<string, unknown> = { ...validCreate };
    delete rest.area;
    expect(createTextoLivreSchema.safeParse(rest).success).toBe(false);
  });
});

describe("updateTextoLivreSchema", () => {
  const validUpdate = {
    colecaoId: "00000000-0000-0000-0000-000000000002",
    conteudo: "Texto atualizado com mais de dez caracteres.",
    area: "Operacional" as const,
  };

  it("aceita um payload completo e válido", () => {
    expect(updateTextoLivreSchema.safeParse(validUpdate).success).toBe(true);
  });

  it("rejects colecaoId que não é uuid", () => {
    expect(
      updateTextoLivreSchema.safeParse({ ...validUpdate, colecaoId: "123" })
        .success,
    ).toBe(false);
  });

  it("rejects conteúdo com menos de 10 caracteres", () => {
    expect(
      updateTextoLivreSchema.safeParse({ ...validUpdate, conteudo: "curto" })
        .success,
    ).toBe(false);
  });
});

describe("listTextoLivreSchema", () => {
  it("aceita um periodoId válido", () => {
    expect(
      listTextoLivreSchema.safeParse({
        periodoId: "00000000-0000-0000-0000-000000000001",
      }).success,
    ).toBe(true);
  });

  it("rejects periodoId que não é uuid", () => {
    expect(
      listTextoLivreSchema.safeParse({ periodoId: "nao-e-uuid" }).success,
    ).toBe(false);
  });
});
