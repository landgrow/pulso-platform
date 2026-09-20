import { describe, it, expect } from "vitest";
import {
  staffCan,
  DEFAULT_CONSULTANT_CAPABILITIES,
  STAFF_CAPABILITIES,
  STAFF_CAPABILITY_IDS,
} from "@/lib/auth/staff-access";

describe("staffCan", () => {
  it("gives platform_admin every capability", () => {
    expect(staffCan("platform_admin", "metricas")).toBe(true);
    expect(staffCan("platform_admin", "equipe")).toBe(true);
    expect(staffCan("platform_admin", "atividades")).toBe(true);
  });

  it("gives consultant only granted functions", () => {
    expect(staffCan("consultant", "atividades", ["atividades", "crm"])).toBe(
      true,
    );
    expect(staffCan("consultant", "metricas", ["atividades", "crm"])).toBe(
      false,
    );
    expect(staffCan("consultant", "equipe", ["atividades"])).toBe(false);
  });

  it("gives clients no staff capabilities", () => {
    expect(staffCan(null, "atividades")).toBe(false);
    expect(staffCan(null, "metricas")).toBe(false);
  });

  it("defaults new consultants to operação, not finance or admin tasks", () => {
    expect(DEFAULT_CONSULTANT_CAPABILITIES).toContain("atividades");
    expect(DEFAULT_CONSULTANT_CAPABILITIES).not.toContain("metricas");
    expect(DEFAULT_CONSULTANT_CAPABILITIES).not.toContain("financeiro");
    expect(DEFAULT_CONSULTANT_CAPABILITIES).not.toContain("equipe");
    expect(STAFF_CAPABILITY_IDS).toContain("metricas");
    expect(STAFF_CAPABILITY_IDS).toContain("financeiro");
  });

  it("lists Financeiro and Métricas as separate places", () => {
    expect(STAFF_CAPABILITIES.find((c) => c.id === "financeiro")?.label).toBe(
      "Financeiro",
    );
    expect(STAFF_CAPABILITIES.find((c) => c.id === "metricas")?.label).toBe(
      "Métricas",
    );
    expect(STAFF_CAPABILITIES.find((c) => c.id === "audit_log")?.label).toBe(
      "Histórico de ações",
    );
  });
});
