import { describe, expect, it } from "vitest";
import {
  binSharePath,
  binShareSections,
  binShareUrl,
  isBinShareSection,
  resolveBinShareSection,
} from "@/lib/bin-v2";

describe("BIN share links", () => {
  it("builds a sector URL that opens only that form", () => {
    expect(binSharePath("jefferson", "financeiro")).toBe(
      "/clientes/jefferson/bin?setor=financeiro",
    );
    expect(
      binShareUrl("https://pulso.landgrow.com.br/", "jefferson", "rh"),
    ).toBe("https://pulso.landgrow.com.br/clientes/jefferson/bin?setor=rh");
  });

  it("accepts the ten sectors plus geral", () => {
    expect(isBinShareSection("geral")).toBe(true);
    expect(isBinShareSection("financeiro")).toBe(true);
    expect(isBinShareSection("inventado")).toBe(false);
    expect(binShareSections().map((section) => section.id)).toContain(
      "lideranca",
    );
  });

  it("não abre setor antes do diagnóstico geral", () => {
    expect(resolveBinShareSection("operacional", null)).toBeNull();
    expect(resolveBinShareSection("geral", null)).toBe("geral");
    expect(
      resolveBinShareSection("operacional", "2026-09-20T12:00:00.000Z"),
    ).toBe("operacional");
    expect(resolveBinShareSection("inventado", "2026-09-20T12:00:00.000Z")).toBe(
      null,
    );
  });
});
