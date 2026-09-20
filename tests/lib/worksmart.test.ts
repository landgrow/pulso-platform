import { describe, it, expect } from "vitest";
import {
  actionIsDone,
  daysUntil,
  derivedObjectiveStatus,
  filledSmartCount,
  fiveH2WSummary,
  format5h2wNotes,
  horizonChip,
  isObjectiveAchieved,
  isSmartComplete,
  krProgressLabel,
  krProgressPercent,
  objectiveProgressPercent,
  parse5h2wNotes,
  resolveCascadeOwner,
  toNumber,
} from "@/lib/worksmart/cascade";
import {
  parseMetricFromText,
  suggestActions,
  suggestKeyResults,
} from "@/lib/worksmart/suggest-cascade";

const complete = {
  especifica: "Time qualifica sem o fundador",
  mensuravel: "70% das visitas com script",
  atingivel: "Dois vendedores na operação",
  relevante: "Comercial é o gargalo",
  temporal: "2026-12-15",
};

describe("SMART", () => {
  it("counts filled fields and completes only with all five", () => {
    expect(filledSmartCount(complete)).toBe(5);
    expect(isSmartComplete(complete)).toBe(true);
    expect(isSmartComplete({ ...complete, relevante: "  " })).toBe(false);
    expect(filledSmartCount({ ...complete, temporal: null })).toBe(4);
  });

  it("keeps concluido and promotes rascunho when SMART is complete", () => {
    expect(derivedObjectiveStatus(complete, "rascunho")).toBe("ativo");
    expect(derivedObjectiveStatus(complete, "concluido")).toBe("concluido");
    expect(
      derivedObjectiveStatus({ ...complete, especifica: null }, "ativo"),
    ).toBe("rascunho");
  });
});

describe("key result progress", () => {
  it("prefers metric current/target over card counts", () => {
    expect(
      krProgressPercent({
        current: 4,
        target: 10,
        doneCards: 1,
        totalCards: 8,
      }),
    ).toBe(40);
    expect(
      krProgressLabel({
        current: 4,
        target: 10,
        unit: "%",
        doneCards: 1,
        totalCards: 8,
      }),
    ).toBe("4 / 10 %");
  });

  it("falls back to cards when there is no meta", () => {
    expect(
      krProgressPercent({
        current: null,
        target: null,
        doneCards: 1,
        totalCards: 8,
      }),
    ).toBe(12.5);
    expect(
      krProgressLabel({
        current: null,
        target: null,
        unit: null,
        doneCards: 1,
        totalCards: 8,
      }),
    ).toBe("1 / 8");
  });
});

describe("5H2W", () => {
  it("formats notes and a compact summary", () => {
    const fields = {
      oQue: "Escrever script de qualificação",
      quem: "Nayara",
      quando: "2026-09-30",
      onde: null,
      porQue: null,
      como: "5H2W",
      quanto: null,
    };
    expect(format5h2wNotes(fields)).toBe(
      "O quê: Escrever script de qualificação\nQuem: Nayara\nQuando: 2026-09-30\nComo: 5H2W",
    );
    expect(fiveH2WSummary(fields)).toBe(
      "Quem Nayara · Quando 2026-09-30 · Como 5H2W",
    );
  });

  it("marks done from closed kanban columns", () => {
    expect(actionIsDone("Concluído")).toBe(true);
    expect(actionIsDone("A FAZER")).toBe(false);
  });
});

describe("horizon", () => {
  it("computes remaining days from date-only ISO", () => {
    expect(daysUntil("2026-12-15", "2026-09-16")).toBe(90);
    expect(horizonChip("2026-09-16", "2026-09-16")).toBe("hoje");
    expect(horizonChip("2026-09-10", "2026-09-16")).toBe("atrasado 6d");
    expect(horizonChip(null, "2026-09-16")).toBeNull();
  });

  it("coerces numeric strings from postgres", () => {
    expect(toNumber("70.5")).toBe(70.5);
    expect(toNumber("")).toBeNull();
  });
});

describe("cascade generation", () => {
  it("reads money, percent and counted metrics from SMART text", () => {
    expect(parseMetricFromText("faturar 100k")).toEqual({
      value: 100000,
      unit: "R$",
    });
    expect(parseMetricFromText("70% das visitas")).toEqual({
      value: 70,
      unit: "%",
    });
    expect(parseMetricFromText("Conseguir 5 clientes de 3,5k")).toEqual({
      value: 5,
      unit: "clientes",
    });
  });

  it("builds a key result and 5H2W cards from a complete SMART", () => {
    const source = {
      title: "faturar 100k",
      smartEspecifica: "Conseguir 5 clientes de 3,5k",
      smartMensuravel: "fazer followup com nossos clientes",
      smartAtingivel: "no bni",
      smartRelevante: "network",
      smartTemporal: "2026-09-23",
    };
    expect(suggestKeyResults(source)).toEqual([
      { title: "faturar 100k", targetValue: 100000, unit: "R$" },
    ]);
    const actions = suggestActions(source);
    expect(actions.map((a) => a.oQue)).toEqual([
      "Conseguir 5 clientes de 3,5k",
      "fazer followup com nossos clientes",
    ]);
    expect(actions[0]?.quando).toBe("2026-09-23");
    expect(actions[0]?.quanto).toBe("fazer followup com nossos clientes");
  });

  it("parses 5H2W notes into readable rows", () => {
    expect(
      parse5h2wNotes(
        "O quê: Conseguir 5 clientes\nQuando: 2026-09-23\nComo: no bni",
      ),
    ).toEqual([
      { label: "O quê", value: "Conseguir 5 clientes" },
      { label: "Quando", value: "2026-09-23" },
      { label: "Como", value: "no bni" },
    ]);
  });

  it("treats a concluded or fully met objective as a result", () => {
    expect(
      isObjectiveAchieved({
        status: "concluido",
        keyResults: [],
      }),
    ).toBe(true);
    expect(
      isObjectiveAchieved({
        status: "ativo",
        keyResults: [
          {
            currentValue: 100000,
            targetValue: 100000,
            actions: [{ done: false }],
          },
        ],
      }),
    ).toBe(true);
  });

  it("never leaves a generated card without an owner", () => {
    expect(resolveCascadeOwner("abc", "me")).toBe("abc");
    expect(resolveCascadeOwner(null, "me")).toBe("me");
    expect(resolveCascadeOwner("  ", "")).toBeNull();
  });

  it("averages key-result progress at the objective", () => {
    expect(
      objectiveProgressPercent([
        {
          currentValue: 50,
          targetValue: 100,
          actions: [{ done: true }, { done: false }],
        },
        {
          currentValue: null,
          targetValue: null,
          actions: [{ done: true }, { done: true }],
        },
      ]),
    ).toBe(75);
  });
});
