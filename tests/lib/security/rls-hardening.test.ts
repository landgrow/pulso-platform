import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("migration 0052 — endurece RLS", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "db/migrations/0052_rls_hardening.sql"),
    "utf8",
  );

  it("impede client_viewer de escrever coleção, período e evidência", () => {
    expect(sql).toContain("org_member_can_write");
    expect(sql).toMatch(/client_viewer/);
    expect(sql).toContain("colecoes_insert");
    expect(sql).toContain("colecoes_update");
    expect(sql).toContain("periodos_update");
    expect(sql).toContain("evidencias_insert");
  });

  it("separa SELECT de consultant e WRITE de admin nas integrações", () => {
    expect(sql).toContain("workspace_integrations_select");
    expect(sql).toContain("workspace_integrations_write");
    expect(sql).toContain("is_platform_admin()");
  });

  it("amarra DELETE de card_files e arquivos da Sala ao canal/org", () => {
    expect(sql).toContain("can_access_org");
    expect(sql).toContain("can_see_staff_channel");
    expect(sql).toContain("staff_files_all");
    expect(sql).toContain("staff_canvases_all");
  });
});
