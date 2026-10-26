import { describe, expect, it } from "vitest";
import {
  buildBinDeliverables,
  buildBinReading,
  evaluateBinGates,
  packById,
  verifyBinAnswers,
} from "@/lib/bin-v2";

const servicos = packById("servicos");

describe("portões do BIN Serviços", () => {
  it("dispara continuidade com R07 no pior degrau", () => {
    const gates = evaluateBinGates({ R07: "R07:1" }, servicos);
    expect(gates.portao1.status).toBe("disparado");
    expect(gates.portao3.status).toBe("subordinado");
    expect(gates.bloqueiaEstrutura).toBe(true);
  });

  it("marca fôlego como não gera com F11 no zero", () => {
    const gates = evaluateBinGates({ F11: "F11:1" }, servicos);
    expect(gates.portao2.status).toBe("nao_gera");
    expect(gates.bloqueiaEstrutura).toBe(true);
  });

  it("espera os setores de risco quando nada foi respondido", () => {
    const gates = evaluateBinGates({}, servicos);
    expect(gates.portao1.status).toBe("aguardando");
    expect(gates.portao2.status).toBe("aguardando");
  });
});

describe("verificação de inconsistências", () => {
  it("dispara O-1 quando a empresa funciona sem o dono mas só o dono executa", () => {
    const flags = verifyBinAnswers({ O01: "O01:1", O03: "O03:5" }, servicos, [
      "operacional",
    ]);
    expect(flags.some((flag) => flag.regra === "O-1")).toBe(true);
  });

  it("não dispara O-1 se o par ainda não foi respondido", () => {
    const flags = verifyBinAnswers({ O03: "O03:5" }, servicos, ["operacional"]);
    expect(flags.some((flag) => flag.regra === "O-1")).toBe(false);
  });

  it("ignora regra intersetorial até o segundo setor existir", () => {
    const flags = verifyBinAnswers({ F02: "F02:1", F05: "F05:4" }, servicos, [
      "operacional",
    ]);
    expect(flags.some((flag) => flag.regra === "F-1")).toBe(false);
  });
});

describe("entregáveis setoriais", () => {
  it("gera os quatro entregáveis só com o financeiro enviado", () => {
    const answers = {
      F11: "F11:1",
      F12: "F12:1",
    };
    const reading = buildBinReading(answers, servicos, {
      financeiro: "2026-10-26T12:00:00.000Z",
    });
    expect(reading.completedSectionIds).toEqual(["financeiro"]);
    expect(reading.gates.portao2.status).toBe("nao_gera");

    const sets = buildBinDeliverables(answers, servicos, reading);
    expect(sets.map((set) => set.sectionId)).toEqual([null, "financeiro"]);
    const financeiro = sets.find((set) => set.sectionId === "financeiro");
    expect(financeiro?.items.map((item) => item.kind)).toEqual([
      "radar",
      "compass",
      "horizon",
      "route_planner",
    ]);
    expect(financeiro?.items.every((item) => item.status === "parcial")).toBe(
      true,
    );
    const route = financeiro?.items.find(
      (item) => item.kind === "route_planner",
    );
    expect(route?.bullets.some((bullet) => /fôlego|caixa/i.test(bullet))).toBe(
      true,
    );
  });

  it("atualiza o conjunto quando um segundo setor entra", () => {
    const answers = {
      F11: "F11:4",
      F12: "F12:4",
      R07: "R07:1",
    };
    const reading = buildBinReading(answers, servicos, {
      financeiro: "2026-10-26T12:00:00.000Z",
      rh: "2026-10-26T13:00:00.000Z",
    });
    expect(reading.gates.portao1.status).toBe("disparado");
    const sets = buildBinDeliverables(answers, servicos, reading);
    expect(sets.map((set) => set.sectionId)).toEqual([
      null,
      "financeiro",
      "rh",
    ]);
    const conjunto = sets[0];
    const route = conjunto?.items.find((item) => item.kind === "route_planner");
    expect(route?.headline).toMatch(/Prioridade/i);
    expect(route?.bullets.some((bullet) => /Continuidade/i.test(bullet))).toBe(
      true,
    );
  });
});
