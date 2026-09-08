import { describe, it, expect } from "vitest";
import { z } from "zod";
import { MAX_FILE_SIZE } from "@/lib/storage/file-validator";

// Mesmo padrão de tests/lib/actions/periods.test.ts: recria o schema Zod
// internamente da action, sem mockar o Supabase — mantém o teste focado na
// validação de entrada.

const uploadEvidenciaSchema = z.object({
  id: z.string().uuid("ID de evidência inválido"),
  periodoId: z.string().uuid("ID de período inválido"),
  storagePath: z.string().min(1).max(500),
  tipo: z.enum(["pdf", "excel", "csv", "audio", "outro"]),
  nomeOriginal: z.string().min(1, "Nome do arquivo obrigatório").max(255),
  mimeType: z.string().min(1).max(150),
  tamanhoBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE, "Arquivo acima do limite de 25MB"),
  hash: z.string().length(64, "Hash SHA-256 inválido"),
});

const evidenciaIdSchema = z.object({
  evidenciaId: z.string().uuid("ID de evidência inválido"),
});

const validHash = "a".repeat(64);
const validPayload = {
  id: "00000000-0000-0000-0000-000000000001",
  periodoId: "00000000-0000-0000-0000-000000000002",
  storagePath: "org/periodo/evidencia-arquivo.pdf",
  tipo: "pdf" as const,
  nomeOriginal: "dre-junho.pdf",
  mimeType: "application/pdf",
  tamanhoBytes: 1024,
  hash: validHash,
};

describe("uploadEvidenciaSchema", () => {
  it("aceita um payload completo e válido", () => {
    expect(uploadEvidenciaSchema.safeParse(validPayload).success).toBe(true);
  });

  it("aceita qualquer um dos 5 tipos de evidência", () => {
    for (const tipo of ["pdf", "excel", "csv", "audio", "outro"] as const) {
      expect(
        uploadEvidenciaSchema.safeParse({ ...validPayload, tipo }).success,
      ).toBe(true);
    }
  });

  it("rejects tipo fora do enum permitido", () => {
    expect(
      uploadEvidenciaSchema.safeParse({ ...validPayload, tipo: "video" })
        .success,
    ).toBe(false);
  });

  it("rejects id que não é uuid", () => {
    expect(
      uploadEvidenciaSchema.safeParse({ ...validPayload, id: "nao-e-uuid" })
        .success,
    ).toBe(false);
  });

  it("rejects periodoId que não é uuid", () => {
    expect(
      uploadEvidenciaSchema.safeParse({
        ...validPayload,
        periodoId: "nao-e-uuid",
      }).success,
    ).toBe(false);
  });

  it("rejects tamanhoBytes acima do limite de 25MB", () => {
    const result = uploadEvidenciaSchema.safeParse({
      ...validPayload,
      tamanhoBytes: MAX_FILE_SIZE + 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects tamanhoBytes zero ou negativo", () => {
    expect(
      uploadEvidenciaSchema.safeParse({ ...validPayload, tamanhoBytes: 0 })
        .success,
    ).toBe(false);
    expect(
      uploadEvidenciaSchema.safeParse({ ...validPayload, tamanhoBytes: -10 })
        .success,
    ).toBe(false);
  });

  it("rejects hash com tamanho diferente de 64 caracteres", () => {
    expect(
      uploadEvidenciaSchema.safeParse({ ...validPayload, hash: "curto" })
        .success,
    ).toBe(false);
  });

  it("rejects nomeOriginal vazio", () => {
    expect(
      uploadEvidenciaSchema.safeParse({ ...validPayload, nomeOriginal: "" })
        .success,
    ).toBe(false);
  });

  it("rejects quando falta um campo obrigatório", () => {
    const rest: Record<string, unknown> = { ...validPayload };
    delete rest.storagePath;
    expect(uploadEvidenciaSchema.safeParse(rest).success).toBe(false);
  });
});

describe("evidenciaIdSchema", () => {
  it("aceita um uuid válido", () => {
    expect(
      evidenciaIdSchema.safeParse({
        evidenciaId: "00000000-0000-0000-0000-000000000001",
      }).success,
    ).toBe(true);
  });

  it("rejects um id que não é uuid", () => {
    expect(evidenciaIdSchema.safeParse({ evidenciaId: "123" }).success).toBe(
      false,
    );
  });
});
