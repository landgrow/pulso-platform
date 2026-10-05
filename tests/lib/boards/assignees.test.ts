import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { canBeAssignee, listOrgAssignees } from "@/lib/boards/assignees";

type Tables = {
  organizations: { is_internal: boolean };
  platform_roles: { user_id: string; role: string }[];
  consultant_assignments: { consultant_id: string; org_id: string }[];
  memberships: { user_id: string; org_id: string }[];
  profiles: { id: string; full_name: string | null }[];
  emails: Record<string, string>;
};

function fakeAdmin(t: Tables) {
  const rows = (table: string): unknown[] => {
    if (table === "platform_roles") return t.platform_roles;
    if (table === "consultant_assignments") return t.consultant_assignments;
    if (table === "memberships") return t.memberships;
    if (table === "profiles") return t.profiles;
    return [];
  };
  return {
    from(table: string) {
      let filtered = rows(table) as Record<string, unknown>[];
      const q = {
        select: () => q,
        eq: (col: string, val: string) => {
          filtered = filtered.filter((r) => r[col] === val);
          return q;
        },
        in: (col: string, vals: string[]) => {
          filtered = filtered.filter((r) => vals.includes(r[col] as string));
          return q;
        },
        maybeSingle: () =>
          Promise.resolve({
            data: table === "organizations" ? t.organizations : null,
          }),
        then: (resolve: (v: { data: unknown[] }) => unknown) =>
          resolve({ data: filtered }),
      };
      return q;
    },
    auth: {
      admin: {
        getUserById: (id: string) =>
          Promise.resolve({
            data: { user: { id, email: t.emails[id] ?? null } },
          }),
      },
    },
  } as never;
}

const base: Tables = {
  organizations: { is_internal: false },
  platform_roles: [
    { user_id: "admin", role: "platform_admin" },
    { user_id: "cons-ok", role: "consultant" },
    { user_id: "cons-other", role: "consultant" },
  ],
  consultant_assignments: [
    { consultant_id: "cons-ok", org_id: "org-1" },
    { consultant_id: "cons-other", org_id: "org-2" },
  ],
  memberships: [
    { user_id: "dono", org_id: "org-1" },
    { user_id: "func", org_id: "org-1" },
    { user_id: "de-outra-org", org_id: "org-2" },
  ],
  profiles: [
    { id: "admin", full_name: "Nayara" },
    { id: "cons-ok", full_name: "Consultor Atribuído" },
    { id: "dono", full_name: "Dona do Negócio" },
    { id: "func", full_name: null },
  ],
  emails: { func: "func@cliente.com" },
};

describe("listOrgAssignees", () => {
  it("traz admin, consultor atribuído, dono e funcionário — e ninguém de fora", async () => {
    const list = await listOrgAssignees(fakeAdmin(base), "org-1");
    expect(list.map((a) => a.userId).sort()).toEqual(
      ["admin", "cons-ok", "dono", "func"].sort(),
    );
  });

  it("separa equipe Land Grow de usuários da org, equipe primeiro", async () => {
    const list = await listOrgAssignees(fakeAdmin(base), "org-1");
    expect(list.map((a) => a.kind)).toEqual([
      "staff",
      "staff",
      "member",
      "member",
    ]);
  });

  it("usa o e-mail quando o perfil não tem nome", async () => {
    const list = await listOrgAssignees(fakeAdmin(base), "org-1");
    expect(list.find((a) => a.userId === "func")?.name).toBe(
      "func@cliente.com",
    );
  });

  it("na org interna da Land Grow entra toda a equipe", async () => {
    const list = await listOrgAssignees(
      fakeAdmin({ ...base, organizations: { is_internal: true } }),
      "org-1",
    );
    expect(list.map((a) => a.userId)).toContain("cons-other");
  });
});

describe("canBeAssignee", () => {
  it("aceita quem é da org ou da equipe e recusa estranhos", async () => {
    const admin = fakeAdmin(base);
    expect(await canBeAssignee(admin, "org-1", "func")).toBe(true);
    expect(await canBeAssignee(admin, "org-1", "admin")).toBe(true);
    expect(await canBeAssignee(admin, "org-1", "de-outra-org")).toBe(false);
    expect(await canBeAssignee(admin, "org-1", "cons-other")).toBe(false);
  });
});
