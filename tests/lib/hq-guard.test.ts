import { describe, expect, it } from "vitest";
import {
  hqPathRequiresStaff,
  shouldBlockClientFromHq,
} from "@/lib/auth/hq-guard";

describe("HQ path guard", () => {
  it("marca /admin e filhos como HQ", () => {
    expect(hqPathRequiresStaff("/admin")).toBe(true);
    expect(hqPathRequiresStaff("/admin/sala")).toBe(true);
    expect(hqPathRequiresStaff("/dashboard")).toBe(false);
    expect(hqPathRequiresStaff("/clientes/ontec")).toBe(false);
  });

  it("barra cliente de /admin e deixa a equipe passar", () => {
    expect(shouldBlockClientFromHq(false, "/admin/financeiro")).toBe(true);
    expect(shouldBlockClientFromHq(true, "/admin/financeiro")).toBe(false);
    expect(shouldBlockClientFromHq(false, "/clientes/ontec")).toBe(false);
  });
});
