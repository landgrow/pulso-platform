import { describe, expect, it } from "vitest";
import {
  BIN_INSTRUMENTS,
  buildBinReadingView,
  publicBinInstruments,
  readBinFlow,
  type BinAnswers,
} from "@/lib/bin-v2";

/**
 * O que vai para o navegador não pode carregar o método da Land Grow:
 * pesos, notas das opções, observações, destinos, camadas, ação dos gatilhos.
 */
describe("questionário público", () => {
  const pub = publicBinInstruments();

  it("tem os três pacotes com as mesmas perguntas e opções", () => {
    for (const id of ["servicos", "varejo", "industria"] as const) {
      const full = BIN_INSTRUMENTS[id];
      expect(pub[id].questions.map((q) => q.id)).toEqual(
        full.questions.map((q) => q.id),
      );
      expect(pub[id].questions.map((q) => q.prompt)).toEqual(
        full.questions.map((q) => q.prompt),
      );
      expect(
        pub[id].questions.flatMap((q) => q.options.map((o) => o.label)),
      ).toEqual(full.questions.flatMap((q) => q.options.map((o) => o.label)));
      expect(pub[id].visibility).toEqual(full.visibility);
    }
  });

  it("não leva peso, nota de opção, observação, destino nem camada", () => {
    for (const instrument of Object.values(pub)) {
      for (const q of instrument.questions) {
        expect(q.peso).toBeNull();
        expect(q.destinations).toEqual([]);
        expect(q.layer).toBeNull();
        expect(q.fundamentoVinculado ?? null).toBeNull();
        for (const o of q.options) {
          expect(o.valorRelativo).toBeNull();
          expect(o.observacao).toBeNull();
        }
      }
      expect(instrument.notes).toEqual([]);
    }
  });

  it("o original continua com os pesos (o servidor ainda pontua)", () => {
    expect(
      BIN_INSTRUMENTS.servicos.questions.some((q) => q.peso !== null),
    ).toBe(true);
  });
});

describe("leitura enviada para a tela", () => {
  // Responde todas as perguntas com a primeira opção para gerar notas.
  const answers: BinAnswers = {};
  for (const q of BIN_INSTRUMENTS.servicos.questions) {
    if (q.ui === "textarea") answers[q.id] = "resposta";
    else if (q.ui === "checkbox")
      answers[q.id] = q.options[0] ? [q.options[0].value] : [];
    else if (q.options[0]) answers[q.id] = q.options[0].value;
  }
  const setores = Object.fromEntries(
    BIN_INSTRUMENTS.servicos.sections.map((s) => [s.id, "2026-10-01"]),
  );
  const flow = {
    ...readBinFlow(undefined),
    geralEnviadoEm: "2026-10-01",
    setoresEnviados: setores,
  };

  it("não leva pesos internos da nota nem a ação dos gatilhos", () => {
    const view = buildBinReadingView(answers, "servicos", flow);
    for (const row of view.reading.sections) {
      expect(row.score.pesosAplicaveis).toBe(0);
      expect(row.score.pesosTotais).toBe(0);
      expect(row.score.peso8Zeros).toEqual([]);
      expect(row.score.bloqueios).toEqual([]);
    }
    for (const flag of view.reading.flags) {
      expect(flag.acao).toBe("");
      expect(flag.precedencia).toBeNull();
    }
    expect(view.reading.lastro).toEqual([]);
    expect(view.answerScores).toBeUndefined();
    expect(JSON.stringify(view)).not.toContain('"peso"');
    expect(JSON.stringify(view)).not.toContain("valorRelativo");
  });

  it("a equipe recebe o rótulo de pontos de cada pergunta", () => {
    const view = buildBinReadingView(answers, "servicos", flow, {
      staff: true,
    });
    expect(view.answerScores).toBeDefined();
    expect(Object.values(view.answerScores ?? {}).some(Boolean)).toBe(true);
  });

  it("as notas continuam calculadas (a tela não perde informação)", () => {
    const view = buildBinReadingView(answers, "servicos", flow);
    expect(view.sectors.length).toBe(BIN_INSTRUMENTS.servicos.sections.length);
    expect(
      view.reading.sections.some(
        (row) => row.section.id !== "geral" && row.score.nota !== null,
      ),
    ).toBe(true);
  });
});
