import { describe, it, expect } from "vitest";
import { parseNotificationPrefs } from "@/lib/settings/notifications";
import { visibleSettingsNav } from "@/lib/settings/nav";

describe("parseNotificationPrefs", () => {
  it("fills defaults when metadata is empty", () => {
    expect(parseNotificationPrefs(undefined).prazo).toBe(true);
    expect(parseNotificationPrefs(null).resumoDiario).toBe(false);
  });

  it("keeps saved booleans", () => {
    expect(
      parseNotificationPrefs({ prazo: false, resumoDiario: true }).prazo,
    ).toBe(false);
    expect(
      parseNotificationPrefs({ prazo: false, resumoDiario: true }).resumoDiario,
    ).toBe(true);
  });
});

describe("visibleSettingsNav", () => {
  it("hides operação and audit from clients", () => {
    const items = visibleSettingsNav({ isStaff: false, canAudit: false });
    expect(items.map((i) => i.href)).not.toContain("/configuracoes/operacao");
    expect(items.map((i) => i.href)).not.toContain("/configuracoes/audit-log");
    expect(items.map((i) => i.href)).toContain("/configuracoes/conta");
  });

  it("shows operação to staff and audit when granted", () => {
    const items = visibleSettingsNav({ isStaff: true, canAudit: true });
    expect(items.map((i) => i.href)).toContain("/configuracoes/operacao");
    expect(items.map((i) => i.href)).toContain("/configuracoes/audit-log");
  });
});
