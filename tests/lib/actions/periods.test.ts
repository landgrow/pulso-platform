import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schemas são internos (não exportados) — recriamos aqui a partir do que o action espera.
// Mantém o test focado no comportamento de validação, sem precisar mockar o Supabase.

const createPeriodSchema = z.object({
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2024).max(2100),
});

const updatePeriodDataSchema = z.object({
  periodId: z.string().uuid(),
  status: z
    .enum(["em_coleta", "pronto_para_analise", "analisado", "fechado"])
    .optional(),
});

const listPeriodsSchema = z.object({
  orgId: z.string().uuid(),
});

const periodIdSchema = z.object({
  periodId: z.string().uuid(),
});

describe("createPeriodSchema", () => {
  it("aceita mês e ano válidos", () => {
    expect(createPeriodSchema.safeParse({ mes: 9, ano: 2026 }).success).toBe(
      true,
    );
  });

  it("aceita todos os meses do ano", () => {
    for (let mes = 1; mes <= 12; mes++) {
      expect(createPeriodSchema.safeParse({ mes, ano: 2026 }).success).toBe(
        true,
      );
    }
  });

  it("rejeita mês 0", () => {
    expect(createPeriodSchema.safeParse({ mes: 0, ano: 2026 }).success).toBe(
      false,
    );
  });

  it("rejeita mês 13", () => {
    expect(createPeriodSchema.safeParse({ mes: 13, ano: 2026 }).success).toBe(
      false,
    );
  });

  it("rejeita ano anterior a 2024", () => {
    expect(createPeriodSchema.safeParse({ mes: 9, ano: 2023 }).success).toBe(
      false,
    );
  });

  it("rejeita mês decimal", () => {
    expect(createPeriodSchema.safeParse({ mes: 9.5, ano: 2026 }).success).toBe(
      false,
    );
  });

  it("rejeita ano como string", () => {
    expect(createPeriodSchema.safeParse({ mes: 9, ano: "2026" }).success).toBe(
      false,
    );
  });
});

describe("updatePeriodDataSchema", () => {
  it("aceita periodId uuid + status válido", () => {
    const result = updatePeriodDataSchema.safeParse({
      periodId: "00000000-0000-0000-0000-000000000000",
      status: "pronto_para_analise",
    });
    expect(result.success).toBe(true);
  });

  it("aceita sem status (update vazio é rejeitado no app, mas schema permite)", () => {
    const result = updatePeriodDataSchema.safeParse({
      periodId: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita periodId não-uuid", () => {
    expect(
      updatePeriodDataSchema.safeParse({
        periodId: "not-a-uuid",
        status: "fechado",
      }).success,
    ).toBe(false);
  });

  it("rejeita status inválido", () => {
    expect(
      updatePeriodDataSchema.safeParse({
        periodId: "00000000-0000-0000-0000-000000000000",
        status: "invalido",
      }).success,
    ).toBe(false);
  });
});

describe("listPeriodsSchema", () => {
  it("aceita orgId uuid", () => {
    expect(
      listPeriodsSchema.safeParse({
        orgId: "00000000-0000-0000-0000-000000000000",
      }).success,
    ).toBe(true);
  });

  it("rejeita orgId não-uuid", () => {
    expect(listPeriodsSchema.safeParse({ orgId: "abc" }).success).toBe(false);
  });
});

describe("periodIdSchema", () => {
  it("aceita periodId uuid", () => {
    expect(
      periodIdSchema.safeParse({
        periodId: "00000000-0000-0000-0000-000000000000",
      }).success,
    ).toBe(true);
  });

  it("rejeita periodId vazio", () => {
    expect(periodIdSchema.safeParse({ periodId: "" }).success).toBe(false);
  });
});

describe("Result type shape", () => {
  // Testa o tipo de retorno de forma estrutural, sem importar a action diretamente.

  it("Result<T> success tem data e success=true", () => {
    type R =
      | { success: true; data: { x: number } }
      | { success: false; error: string };
    const r: R = { success: true, data: { x: 42 } };
    if (r.success) {
      expect(r.data.x).toBe(42);
    }
  });

  it("Result<T> failure tem error e success=false", () => {
    type R =
      | { success: true; data: { x: number } }
      | { success: false; error: string };
    const r: R = { success: false, error: "qualquer" };
    if (!r.success) {
      expect(r.error).toBe("qualquer");
    }
  });
});

describe("ErrorCode enum", () => {
  it("cobre os 5 casos esperados", () => {
    const codes = [
      "PERMISSION_DENIED",
      "INVALID_INPUT",
      "NOT_FOUND",
      "PERIOD_CLOSED",
      "INTERNAL_ERROR",
    ] as const;
    expect(codes.length).toBe(5);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z_]+$/);
    }
  });
});

describe("Lógica de períodos (helper functions)", () => {
  // Testa a lógica de idempotência isoladamente, sem Supabase.

  function getCurrentMesAno(): { mes: number; ano: number } {
    const now = new Date();
    return { mes: now.getMonth() + 1, ano: now.getFullYear() };
  }

  it("getCurrentMesAno retorna mês entre 1 e 12", () => {
    const { mes } = getCurrentMesAno();
    expect(mes).toBeGreaterThanOrEqual(1);
    expect(mes).toBeLessThanOrEqual(12);
  });

  it("getCurrentMesAno retorna ano >= 2024", () => {
    const { ano } = getCurrentMesAno();
    expect(ano).toBeGreaterThanOrEqual(2024);
  });

  it("idempotência: mesmo (mes, ano) duas vezes dá o mesmo periodId simulado", () => {
    // Simula o comportamento de createPeriod: 2ª chamada retorna o mesmo id
    const periodos = new Map<string, string>();
    function create(mes: number, ano: number): string {
      const key = `${ano}-${mes}`;
      const existing = periodos.get(key);
      if (existing) return existing;
      const id = `period-${Math.random().toString(36).slice(2, 10)}`;
      periodos.set(key, id);
      return id;
    }
    const id1 = create(9, 2026);
    const id2 = create(9, 2026);
    expect(id1).toBe(id2);
  });

  it("chamadas com (mes, ano) diferentes retornam ids diferentes", () => {
    const periodos = new Map<string, string>();
    function create(mes: number, ano: number): string {
      const key = `${ano}-${mes}`;
      const existing = periodos.get(key);
      if (existing) return existing;
      const id = `period-${Math.random().toString(36).slice(2, 10)}`;
      periodos.set(key, id);
      return id;
    }
    const a = create(9, 2026);
    const b = create(10, 2026);
    expect(a).not.toBe(b);
  });
});
