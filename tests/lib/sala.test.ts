import { describe, expect, it } from "vitest";
import { clientNav, HQ_NAV } from "@/lib/nav/destinations";
import {
  dmSlug,
  otherDmUserId,
  previewBody,
  staffDisplayName,
} from "@/lib/sala/dm";
import {
  filterSalaMentions,
  PULSO_MENTION,
  salaMentionLabel,
  salaMentionPeople,
} from "@/lib/sala/mentions";
import {
  formatSalaUnreadBadge,
  tallySalaUnread,
} from "@/lib/sala/unread";
import { DEFAULT_CONSULTANT_CAPABILITIES } from "@/lib/auth/staff-access";

describe("Sala HQ", () => {
  it("builds a stable DM slug regardless of who starts the chat", () => {
    const a = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const b = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    expect(dmSlug(a, b)).toBe(dmSlug(b, a));
    expect(otherDmUserId(dmSlug(a, b), a)).toBe(b);
    expect(otherDmUserId(dmSlug(a, b), b)).toBe(a);
  });

  it("shortens message previews without breaking empty names", () => {
    expect(staffDisplayName(null)).toBe("Colega");
    expect(previewBody("um dois três")).toBe("um dois três");
    expect(previewBody("x".repeat(80)).endsWith("…")).toBe(true);
  });

  it("lives on HQ nav and never on the client portal menu", () => {
    const sala = HQ_NAV.find((item) => item.href === "/admin/sala");
    expect(sala?.visibility).toBe("sala");
    expect(sala?.group).toBe("trabalho");
    const client = clientNav("ontec");
    expect(client.some((item) => item.href.includes("/sala"))).toBe(false);
    expect(client.some((item) => item.label === "Sala")).toBe(false);
    expect(DEFAULT_CONSULTANT_CAPABILITIES).toContain("sala");
    expect(HQ_NAV.find((item) => item.href === "/admin/calendario")?.visibility).toBe(
      "calendario",
    );
  });

  it("lista a equipe e o PULSO assim que o @ é digitado", () => {
    const people = salaMentionPeople([
      { userId: "n", name: "Nayara" },
      { userId: "c", name: "Candido" },
    ]);
    expect(people[0]).toEqual(PULSO_MENTION);
    expect(filterSalaMentions(people, "").map((p) => p.name)).toEqual([
      "pulso",
      "Nayara",
      "Candido",
    ]);
    expect(filterSalaMentions(people, "na").map((p) => p.name)).toEqual(["Nayara"]);
    expect(salaMentionLabel(PULSO_MENTION)).toBe("PULSO · operação");
  });

  it("counts only messages from other people after last_read", () => {
    const me = "naya";
    const lastRead = new Map<string, string | null>([
      ["op", "2026-10-26T19:20:00.000Z"],
      ["dm", null],
    ]);
    const total = tallySalaUnread(
      [
        {
          channelId: "op",
          authorId: "candi",
          createdAt: "2026-10-26T19:19:00.000Z",
        },
        {
          channelId: "op",
          authorId: "candi",
          createdAt: "2026-10-26T19:30:00.000Z",
        },
        {
          channelId: "op",
          authorId: me,
          createdAt: "2026-10-26T19:40:00.000Z",
        },
        {
          channelId: "dm",
          authorId: "candi",
          createdAt: "2026-10-26T18:00:00.000Z",
        },
      ],
      lastRead,
      me,
    );
    expect(total).toBe(2);
    expect(formatSalaUnreadBadge(0)).toBeNull();
    expect(formatSalaUnreadBadge(2)).toBe("2");
    expect(formatSalaUnreadBadge(12)).toBe("9+");
  });
});
