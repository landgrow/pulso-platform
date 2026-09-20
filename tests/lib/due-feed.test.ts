import { describe, expect, it } from "vitest";
import { classifyDue, splitDueCards, type DueCard } from "@/lib/ops/due";

function card(id: string, prazo: string, isInternal = false): DueCard {
  return {
    id,
    titulo: id,
    prazo,
    prioridade: "media",
    orgId: "o1",
    orgName: isInternal ? "Land Grow" : "Cliente",
    orgSlug: "slug",
    isInternal,
    boardName: "Plano",
    columnLabel: "A FAZER",
    responsavelNome: null,
    relatedOrgName: null,
    href: "/admin/atividades",
  };
}

describe("classifyDue", () => {
  it("marks past dates as atrasada", () => {
    expect(classifyDue("2026-09-01", "2026-09-18")).toBe("atrasada");
  });

  it("marks today as hoje", () => {
    expect(classifyDue("2026-09-18", "2026-09-18")).toBe("hoje");
  });

  it("marks future as a_vencer", () => {
    expect(classifyDue("2026-09-25", "2026-09-18")).toBe("a_vencer");
  });
});

describe("splitDueCards", () => {
  it("orders buckets without mixing", () => {
    const split = splitDueCards(
      [
        card("a", "2026-09-10"),
        card("b", "2026-09-18"),
        card("c", "2026-09-20"),
      ],
      "2026-09-18",
    );
    expect(split.atrasadas.map((c) => c.id)).toEqual(["a"]);
    expect(split.hoje.map((c) => c.id)).toEqual(["b"]);
    expect(split.aVencer.map((c) => c.id)).toEqual(["c"]);
  });
});
