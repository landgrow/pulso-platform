import { describe, it, expect } from "vitest";
import {
  buildFormularioSchema,
  calcProgresso,
  countPerBlock,
} from "@/lib/validations/formulario";

// Payload com todos os 10 campos obrigatórios preenchidos (os 2 campos de
// Marketing são opcionais e ficam de fora de propósito).
const validPayload = {
  fin_faturamento: 250000,
  fin_margem: 18,
  op_equipe_tamanho: 12,
  op_processos_doc: "sim",
  com_clientes_ativos: 45,
  com_ticket_medio: 1200,
  pes_turnover: 15,
  pes_avaliacao: "trimestral",
  est_okr_ativo: "sim",
  est_revisao_estrategica: "nao",
};

describe("buildFormularioSchema()", () => {
  const schema = buildFormularioSchema();

  it("accepts a fully valid payload with todos os campos obrigatórios", () => {
    expect(schema.safeParse(validPayload).success).toBe(true);
  });

  it("accepts quando os campos opcionais de Marketing são omitidos", () => {
    expect(schema.safeParse(validPayload).success).toBe(true);
  });

  it("accepts quando o campo numérico opcional é informado", () => {
    const result = schema.safeParse({
      ...validPayload,
      mkt_instagram_seguidores: 3200,
    });
    expect(result.success).toBe(true);
  });

  it("rejects quando falta um campo numérico obrigatório", () => {
    const rest: Record<string, unknown> = { ...validPayload };
    delete rest.fin_faturamento;
    expect(schema.safeParse(rest).success).toBe(false);
  });

  it("rejects quando falta um campo radio obrigatório", () => {
    const rest: Record<string, unknown> = { ...validPayload };
    delete rest.op_processos_doc;
    expect(schema.safeParse(rest).success).toBe(false);
  });

  it("rejects uma opção de radio inválida", () => {
    const result = schema.safeParse({
      ...validPayload,
      op_processos_doc: "talvez",
    });
    expect(result.success).toBe(false);
  });

  it("rejects uma opção de select inválida", () => {
    const result = schema.safeParse({
      ...validPayload,
      pes_avaliacao: "nunca",
    });
    expect(result.success).toBe(false);
  });

  it("rejects um número fora do intervalo permitido (max)", () => {
    const result = schema.safeParse({ ...validPayload, pes_turnover: 150 }); // max: 100
    expect(result.success).toBe(false);
  });

  it("coerces string numérica para número", () => {
    const result = schema.safeParse({
      ...validPayload,
      fin_faturamento: "250000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects texto não-numérico em campo numérico", () => {
    const result = schema.safeParse({
      ...validPayload,
      fin_faturamento: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("accepts textarea opcional dentro do limite de caracteres", () => {
    const result = schema.safeParse({
      ...validPayload,
      mkt_descricao: "Focamos em Instagram.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects textarea acima do limite máximo de caracteres", () => {
    const result = schema.safeParse({
      ...validPayload,
      mkt_descricao: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe("calcProgresso()", () => {
  it("retorna 0 quando o payload está vazio", () => {
    expect(calcProgresso({})).toBe(0);
  });

  it("retorna 100 quando todos os campos obrigatórios estão preenchidos", () => {
    expect(calcProgresso(validPayload)).toBe(100);
  });

  it("retorna um percentual parcial quando só parte dos campos obrigatórios está preenchida", () => {
    const rest: Record<string, unknown> = { ...validPayload };
    delete rest.fin_faturamento;
    delete rest.fin_margem;
    const progresso = calcProgresso(rest);
    expect(progresso).toBeGreaterThan(0);
    expect(progresso).toBeLessThan(100);
  });

  it("ignora campos opcionais no cálculo do percentual", () => {
    // Preenchendo só os opcionais de Marketing não deveria mover o percentual
    expect(
      calcProgresso({ mkt_instagram_seguidores: 3200, mkt_descricao: "texto" }),
    ).toBe(0);
  });
});

describe("countPerBlock()", () => {
  it("conta campos preenchidos, totais e obrigatórios por área", () => {
    const counts = countPerBlock(validPayload);
    expect(counts["Financeiro"]).toEqual({ filled: 2, total: 2, required: 2 });
    expect(counts["Marketing"]).toEqual({ filled: 0, total: 2, required: 0 });
  });

  it("cobre todas as 6 áreas do formulário", () => {
    const counts = countPerBlock({});
    expect(Object.keys(counts)).toEqual([
      "Financeiro",
      "Operacional",
      "Comercial",
      "Pessoas",
      "Estratégico",
      "Marketing",
    ]);
  });
});
