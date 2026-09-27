import { describe, expect, it } from "vitest";
import {
  portalPathFromRows,
  type MembershipOrgRow,
} from "@/lib/auth/client-portal";

const client = (
  id: string,
  slug: string,
  extra: { is_internal?: boolean | null; deleted_at?: string | null } = {},
): MembershipOrgRow => ({
  org_id: id,
  organizations: {
    slug,
    is_internal: false,
    deleted_at: null,
    ...extra,
  },
});

describe("portalPathFromRows", () => {
  it("sends a client to the company slug", () => {
    expect(portalPathFromRows([client("a", "land-grow-3")], null)).toBe(
      "/land-grow-3",
    );
  });

  it("keeps staff-only sessions on the dashboard", () => {
    expect(portalPathFromRows([], null)).toBe("/dashboard");
  });

  it("ignores the internal Land Grow org", () => {
    expect(
      portalPathFromRows(
        [client("hq", "land-grow", { is_internal: true }), client("c", "acme")],
        "hq",
      ),
    ).toBe("/acme");
  });

  it("prefers the active client org", () => {
    expect(
      portalPathFromRows([client("a", "antiga"), client("b", "nova")], "b"),
    ).toBe("/nova");
  });
});
