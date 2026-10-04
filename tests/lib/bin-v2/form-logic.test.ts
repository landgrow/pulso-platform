import { describe, expect, it } from "vitest";
import {
  binInstrument,
  calcBinProgress,
  getBinQuestion,
  isQuestionVisible,
  parseBinAnswers,
  parseBinGeral,
  pruneHiddenAnswers,
  requireBinQuestion,
  resolveBinRoute,
  binDirectedFormStatus,
} from "@/lib/bin-v2";
import type { BinAnswers } from "@/lib/bin-v2";

describe("BIN Serviços v2 — instrumento", () => {
  it("carrega 182 questões em 11 seções", () => {
    expect(binInstrument.questions).toHaveLength(182);
    expect(binInstrument.sections).toHaveLength(11);
  });

  it("injeta O00 e usa o título de inovação sem viés", () => {
    expect(getBinQuestion("O00")?.prompt).toMatch(/relação com essa área/i);
    const inovacao = binInstrument.sections.find((s) => s.id === "inovacao");
    expect(inovacao?.title).toBe("Inovação");
  });

  it("G07 só aparece se a empresa faz mais de uma coisa", () => {
    const g07 = requireBinQuestion("G07");
    expect(isQuestionVisible(g07, {})).toBe(false);
    expect(isQuestionVisible(g07, { G06: "G06:3" })).toBe(false);
    expect(isQuestionVisible(g07, { G06: "G06:4" })).toBe(true);
  });

  it("não conta G07 no progresso enquanto ela está escondida", () => {
    const answers: BinAnswers = {};
    for (const q of binInstrument.questions) {
      if (q.id === "G07") continue;
      if (q.ui === "textarea") answers[q.id] = "texto";
      else if (q.ui === "checkbox") answers[q.id] = [q.options[0]?.value ?? ""];
      else answers[q.id] = q.options[0]?.value ?? "x";
    }
    expect(calcBinProgress(answers)).toBe(100);
  });

  it("remove G07 ao mudar o roteador", () => {
    const pruned = pruneHiddenAnswers({
      G06: "G06:3",
      G07: "G07:1",
    });
    expect(pruned.G07).toBeUndefined();
  });

  it("múltipla de perfil não passa com array vazio", () => {
    const { success, errors } = parseBinAnswers({
      A01: [],
    });
    expect(success).toBe(false);
    expect(errors.A01).toBeTruthy();
  });
});

describe("BIN roteador G06/G07", () => {
  it("fabrica vai para indústria", () => {
    expect(resolveBinRoute({ G06: "G06:1" })).toBe("industria");
  });

  it("revenda vai para varejo", () => {
    expect(resolveBinRoute({ G06: "G06:2" })).toBe("varejo");
  });

  it("serviço vai para serviços", () => {
    expect(resolveBinRoute({ G06: "G06:3" })).toBe("servicos");
  });

  it("ainda decidindo vai para pré-operação", () => {
    expect(resolveBinRoute({ G06: "G06:5" })).toBe("pre_operacao");
  });

  it("híbrido usa G07 para fechar a rota", () => {
    expect(resolveBinRoute({ G06: "G06:4", G07: "G07:3" })).toBe("servicos");
    expect(resolveBinRoute({ G06: "G06:4", G07: "G07:2" })).toBe("varejo");
    expect(resolveBinRoute({ G06: "G06:4", G07: "G07:1" })).toBe("industria");
  });

  it("híbrido sem saber o que dá mais dinheiro não fecha rota", () => {
    expect(resolveBinRoute({ G06: "G06:4", G07: "G07:5" })).toBeNull();
  });

  it("só o formulário de serviços está pronto na v2", () => {
    expect(binDirectedFormStatus("servicos")).toBe("ready");
    expect(binDirectedFormStatus("varejo")).toBe("pending");
    expect(binDirectedFormStatus("industria")).toBe("pending");
    expect(binDirectedFormStatus("pre_operacao")).toBe("coverage");
  });

  it("Enviar do geral exige as perguntas visíveis do tronco", () => {
    const incomplete = parseBinGeral({ G06: "G06:3" });
    expect(incomplete.success).toBe(false);
    expect(incomplete.errors.G01).toBeTruthy();
  });
});
