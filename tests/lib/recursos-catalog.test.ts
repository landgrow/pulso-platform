import { describe, it, expect } from "vitest";
import { HQ_NAV, clientNav } from "@/lib/nav/destinations";
import {
  RESOURCE_CATALOG,
  applyStatusOverrides,
  canEnterPlan,
  countByStatus,
} from "@/lib/recursos/catalog";

describe("resource catalog", () => {
  it("keeps unique ids and only the three quality statuses", () => {
    const ids = RESOURCE_CATALOG.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      RESOURCE_CATALOG.every((item) =>
        ["pronto", "validando", "rascunho"].includes(item.status),
      ),
    ).toBe(true);
  });

  it("keeps Financeiro on HQ only, out of the client menu", () => {
    const finance = RESOURCE_CATALOG.find((item) => item.id === "financeiro");
    expect(finance?.surfaces).toEqual(["hq"]);
    expect(finance?.kind).toBe("interno");
    expect(clientNav("demo").some((item) => item.href.includes("financeiro"))).toBe(
      false,
    );
  });

  it("does not list Protheus or Prometheus", () => {
    const blob = RESOURCE_CATALOG.map((item) => `${item.id} ${item.name}`).join(
      " ",
    );
    expect(blob.toLowerCase()).not.toMatch(/protheus|prometheus/);
  });

  it("does not put commercial plans in a sellable state", () => {
    const plans = RESOURCE_CATALOG.find((item) => item.id === "planos");
    expect(plans?.status).toBe("rascunho");
    expect(plans && canEnterPlan(plans)).toBe(false);
  });

  it("counts and overrides status without mutating the source", () => {
    const counts = countByStatus(RESOURCE_CATALOG);
    expect(counts.pronto + counts.validando + counts.rascunho).toBe(
      RESOURCE_CATALOG.length,
    );
    const next = applyStatusOverrides(RESOURCE_CATALOG, {
      min: "pronto",
    });
    expect(RESOURCE_CATALOG.find((item) => item.id === "min")?.status).toBe(
      "validando",
    );
    expect(next.find((item) => item.id === "min")?.status).toBe("pronto");
  });

  it("keeps Financeiro on HQ and does not list Recursos or Grafo", () => {
    expect(HQ_NAV.some((item) => item.href === "/admin/recursos")).toBe(false);
    expect(HQ_NAV.some((item) => item.href === "/admin/trabalho")).toBe(false);
    expect(
      HQ_NAV.find((item) => item.href === "/admin/financeiro")?.visibility,
    ).toBe("financeiro");
  });

  it("puts Documentos on HQ nav with the same drive as the client portal", () => {
    const hq = HQ_NAV.find((item) => item.href === "/admin/documentos");
    expect(hq?.visibility).toBe("documentos");
    expect(hq?.group).toBe("trabalho");
    expect(hq?.icon).toBe("folder");
    expect(
      clientNav("ontec").some((item) => item.href.endsWith("/documentos")),
    ).toBe(true);
    expect(
      RESOURCE_CATALOG.find((item) => item.id === "documentos")?.href,
    ).toBe("/admin/documentos");
  });
});
