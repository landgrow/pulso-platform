import { describe, expect, it } from "vitest";
import {
  minBlockByNome,
  minBlockLabel,
  readMinPerguntas,
} from "@/lib/min/blocks";

describe("catálogo MIN", () => {
  it("acha o bloco pelo nome que o cliente vê", () => {
    expect(minBlockByNome("Proposta de Valor")).toMatchObject({
      bloco: "proposta_de_valor",
      fase: "fundacao",
    });
    expect(minBlockByNome("não existe")).toBeNull();
  });

  it("devolve o rótulo a partir do enum", () => {
    expect(minBlockLabel("gestao_de_riscos")).toBe("Gestão de Riscos");
  });

  it("lê só perguntas com resposta", () => {
    expect(
      readMinPerguntas({
        perguntas: [
          { prompt: "O que vendem?", answer: "  Obra  " },
          { prompt: "Vazio", answer: "   " },
          { prompt: 1, answer: "x" },
        ],
      }),
    ).toEqual([{ prompt: "O que vendem?", answer: "Obra" }]);
  });
});
