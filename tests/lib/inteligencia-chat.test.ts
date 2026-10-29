import { describe, expect, it } from "vitest";
import { pulsoChatDossier, pulsoChatSystem } from "@/lib/inteligencia/prompts";

describe("Central IA prompts", () => {
  it("não coloca o dossiê no system", () => {
    const system = pulsoChatSystem({ surface: "admin" });
    expect(system).not.toMatch(/DOSSIÊ/);
    expect(system).not.toMatch(/Ignore previous/);
  });

  it("isola o dossiê como texto não confiável", () => {
    const dossier = pulsoChatDossier("BIN operacional: 12");
    expect(dossier).toMatch(/BEGIN DOSSIER/);
    expect(dossier).toMatch(/não confiável/);
    expect(dossier).toContain("BIN operacional: 12");
  });
});
