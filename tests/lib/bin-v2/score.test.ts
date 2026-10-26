import { describe, expect, it } from "vitest";
import { getBinQuestion, scoreBinAnswer, scoreBinSection } from "@/lib/bin-v2";
import type { BinSection } from "@/lib/bin-v2";

function section(questionIds: string[]): BinSection {
  return {
    id: "operacional",
    prefix: "O",
    title: "Operacional",
    color: "border-sky-500",
    questionIds,
  };
}

describe("pontuação do BIN", () => {
  it("mostra o valor do manual na alternativa marcada", () => {
    const question = getBinQuestion("O01");
    expect(question).toBeTruthy();
    if (!question) return;
    expect(scoreBinAnswer(question, { O01: "O01:2" })).toEqual({
      kind: "pontos",
      valor: 40,
      valorDeclarado: 40,
    });
  });

  it("tira do cálculo a alternativa de escape", () => {
    const question = getBinQuestion("O01");
    expect(question).toBeTruthy();
    if (!question) return;
    expect(scoreBinAnswer(question, { O01: "O01:5" }).kind).toBe("excluida");
  });

  it("fecha a nota do setor e aplica o teto quando duas de peso 8 estão no zero", () => {
    const score = scoreBinSection(section(["O01", "O09", "O13", "O14"]), {
      O01: "O01:4",
      O09: "O09:5",
      O13: "O13:1",
      O14: "O14:1",
    });
    expect(score.status).toBe("nota");
    expect(score.nota).toBe(20);
    expect(score.faixa).toBe("crítico");
  });

  it("não fecha a nota enquanto faltar questão que pontua", () => {
    const score = scoreBinSection(section(["O01", "O02"]), {
      O01: "O01:4",
    });
    expect(score.status).toBe("incompleto");
    expect(score.nota).toBeNull();
  });
});
