import { describe, it, expect } from "vitest";
import {
  getRoleLabel,
  accessibleToOrganization,
} from "@/lib/supabase/organization";
import type { AccessibleOrganization } from "@/types/organization";

describe("getRoleLabel()", () => {
  it("returns Portuguese labels for client roles", () => {
    expect(getRoleLabel("client_owner")).toBe("Proprietário");
    expect(getRoleLabel("client_member")).toBe("Membro");
    expect(getRoleLabel("client_viewer")).toBe("Visualizador");
  });

  it("returns Portuguese labels for platform roles", () => {
    expect(getRoleLabel("platform_admin")).toBe("Admin (Land Grow)");
    expect(getRoleLabel("consultant")).toBe("Consultor (Land Grow)");
  });
});

describe("accessibleToOrganization()", () => {
  it("maps accessible org to full organization shape", () => {
    const accessible: AccessibleOrganization = {
      id: "123",
      slug: "minha-empresa",
      name: "Minha Empresa",
      plan: "pro",
      my_role: "client_owner",
    };

    const org = accessibleToOrganization(accessible);

    expect(org.id).toBe("123");
    expect(org.slug).toBe("minha-empresa");
    expect(org.name).toBe("Minha Empresa");
    expect(org.plan).toBe("pro");
    expect(org.deleted_at).toBeNull();
  });
});
