import { describe, expect, it } from "vitest";
import {
  commentSegments,
  extractMentionIds,
  insertMention,
  isShownBoardProperty,
  mentionQuery,
  mergeCardAssignees,
  parseStoredAssignees,
  personGivenName,
  personLabel,
  personOriginLabel,
} from "@/lib/boards/card-people";

describe("card people", () => {
  it("hides prototype fields and reserved keys", () => {
    expect(
      isShownBoardProperty({ key: "orcamento", label: "Orçamento", visible: true }),
    ).toBe(false);
    expect(
      isShownBoardProperty({
        key: "teste",
        label: "Teste de propriedade",
        visible: true,
      }),
    ).toBe(false);
    expect(
      isShownBoardProperty({ key: "_responsaveis", label: "Pessoas", visible: true }),
    ).toBe(false);
    expect(
      isShownBoardProperty({ key: "fase", label: "Fase", visible: true }),
    ).toBe(true);
  });

  it("keeps the first person and extra Land Grow / client people", () => {
    const people = mergeCardAssignees(
      { userId: "c", name: "Candido", kind: "staff" },
      [
        { userId: "n", name: "Nayara", kind: "staff" },
        { userId: "c", name: "Candido", kind: "staff" },
        { userId: "j", name: "Jefferson", kind: "member" },
      ],
    );
    expect(people.map((p) => p.userId)).toEqual(["c", "n", "j"]);
    expect(personLabel(people[1]!)).toBe("Nayara · Land Grow");
    expect(personLabel(people[2]!)).toBe("Jefferson · Cliente");
    expect(personGivenName({ userId: "x", name: "Candido Silva" })).toBe(
      "Candido",
    );
    expect(personOriginLabel(people[1]!)).toBe("Land Grow");
    expect(personOriginLabel(people[2]!)).toBe("Cliente");
  });

  it("reads stored assignees from the card json", () => {
    expect(
      parseStoredAssignees([
        { userId: "a", name: "Ana", kind: "staff" },
        { junk: true },
      ]),
    ).toEqual([{ userId: "a", name: "Ana", kind: "staff" }]);
  });

  it("inserts @mentions and extracts who was marked", () => {
    const people = [
      { userId: "c", name: "Candido" },
      { userId: "n", name: "Nayara" },
    ];
    expect(mentionQuery("@", 1)).toEqual({ start: 0, query: "" });
    expect(mentionQuery("Olá @Ca", 7)).toEqual({ start: 4, query: "Ca" });
    const inserted = insertMention("Olá @Ca", 7, "Candido");
    expect(inserted.text).toBe("Olá @Candido ");
    expect(extractMentionIds("@Candido e @Nayara, ok?", people)).toEqual([
      "c",
      "n",
    ]);
    expect(commentSegments("Oi @Nayara", people)).toEqual([
      { text: "Oi ", mention: false },
      { text: "@Nayara", mention: true },
    ]);
    expect(extractMentionIds("fala @pulso", [{ userId: "pulso", name: "pulso" }])).toEqual(
      ["pulso"],
    );
    expect(commentSegments("Oi @Pulso", [{ userId: "pulso", name: "pulso" }])).toEqual([
      { text: "Oi ", mention: false },
      { text: "@Pulso", mention: true },
    ]);
  });
});
