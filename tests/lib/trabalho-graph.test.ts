import { describe, it, expect } from "vitest";
import { HQ_NAV, clientNav } from "@/lib/nav/destinations";
import {
  buildWorkGraph,
  relatedOrgIdFromMeeting,
  taskClientName,
} from "@/lib/trabalho/graph";
import { surfaceLabel } from "@/lib/recursos/catalog";

describe("work graph", () => {
  it("chains meeting → task → client → owner and keeps pending checklist", () => {
    const graph = buildWorkGraph({
      meetings: [
        {
          id: "m1",
          titulo: "Semana JS",
          data: "2026-10-20",
          orgName: "JS Construtora",
          orgSlug: "jefferson",
          isInternal: false,
          checklist: [
            { id: "i1", texto: "Fechar RADAR", done: false },
            { id: "i2", texto: "agendar apresentação com cliente X", done: false },
            { id: "i3", texto: "Escrever COMPASS", done: false },
          ],
        },
      ],
      cards: [
        {
          id: "c1",
          titulo: "Fechar RADAR",
          columnLabel: "A FAZER",
          prazo: "2026-10-28",
          sourceMeetingId: "m1",
          sourceChecklistItemId: "i1",
          orgName: "JS Construtora",
          orgSlug: "jefferson",
          isInternal: false,
          relatedOrgName: null,
          responsavelNome: "Nayara",
        },
      ],
    });

    expect(graph.meetings).toHaveLength(1);
    expect(graph.meetings[0]?.tasks).toHaveLength(1);
    expect(graph.meetings[0]?.tasks[0]?.clientName).toBe("JS Construtora");
    expect(graph.meetings[0]?.tasks[0]?.responsavelNome).toBe("Nayara");
    expect(graph.meetings[0]?.pending.map((item) => item.texto)).toEqual([
      "Escrever COMPASS",
    ]);
    expect(graph.meetings[0]?.skippedClientOps).toBe(1);
    expect(graph.counts.pending).toBe(1);
  });

  it("marks Land Grow internal cards without a client", () => {
    expect(
      taskClientName(
        {
          relatedOrgName: null,
          isInternal: true,
          orgName: "Land Grow",
        },
        { isInternal: true, orgName: "Land Grow" },
      ),
    ).toBeNull();
    expect(relatedOrgIdFromMeeting(true, "org-lg")).toBeNull();
    expect(relatedOrgIdFromMeeting(false, "org-js")).toBe("org-js");
  });

  it("puts loose cards aside and counts missing owner", () => {
    const graph = buildWorkGraph({
      meetings: [],
      cards: [
        {
          id: "c2",
          titulo: "Solta",
          columnLabel: "EM ANDAMENTO",
          prazo: null,
          sourceMeetingId: null,
          sourceChecklistItemId: null,
          orgName: "Land Grow",
          orgSlug: "land-grow",
          isInternal: true,
          relatedOrgName: null,
          responsavelNome: null,
        },
      ],
    });
    expect(graph.loose).toHaveLength(1);
    expect(graph.counts.semResponsavel).toBe(1);
    expect(graph.counts.semCliente).toBe(1);
  });
});

describe("work graph in the product", () => {
  it("labels the staff surface as Land Grow, not HQ", () => {
    expect(surfaceLabel(["hq"])).toBe("Só Land Grow");
    expect(surfaceLabel(["hq", "cliente"])).toBe("Land Grow e cliente");
  });

  it("stays off the staff menu and the client menu", () => {
    expect(HQ_NAV.some((item) => item.href === "/admin/trabalho")).toBe(false);
    expect(
      clientNav("demo").some((item) => item.href.includes("trabalho")),
    ).toBe(false);
  });
});
