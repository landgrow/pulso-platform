import { describe, expect, it } from "vitest";
import { applyQueryPatch } from "@/lib/url-state";

describe("applyQueryPatch", () => {
  it("adiciona e troca parâmetros preservando os outros", () => {
    expect(applyQueryPatch("?tab=atividades&lista=a", { lista: "b" })).toBe(
      "tab=atividades&lista=b",
    );
    expect(applyQueryPatch("", { vista: "dashboard" })).toBe("vista=dashboard");
  });

  it("remove com null ou string vazia", () => {
    expect(applyQueryPatch("tab=x&lista=a", { lista: null })).toBe("tab=x");
    expect(applyQueryPatch("lista=a", { lista: "" })).toBe("");
  });

  it("codifica nomes de pasta com acento e barra", () => {
    const qs = applyQueryPatch("", { pasta: "Financeiro março/2026" });
    expect(new URLSearchParams(qs).get("pasta")).toBe("Financeiro março/2026");
  });
});
