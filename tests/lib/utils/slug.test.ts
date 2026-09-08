import { describe, it, expect } from "vitest";
import { generateSlug, ensureUniqueSlug, isValidSlug } from "@/lib/utils/slug";

describe("generateSlug()", () => {
  it("lowercases input", () => {
    expect(generateSlug("Minha Empresa")).toBe("minha-empresa");
  });

  it("removes accents", () => {
    expect(generateSlug("Construção Cívil")).toBe("construcao-civil");
  });

  it("replaces non-alphanumeric with hyphens", () => {
    expect(generateSlug("Foo & Bar!")).toBe("foo-bar");
  });

  it("removes leading and trailing hyphens", () => {
    expect(generateSlug("  ---hello---  ")).toBe("hello");
  });

  it("truncates to 50 characters", () => {
    const long = "a".repeat(100);
    expect(generateSlug(long).length).toBeLessThanOrEqual(50);
  });

  it("handles empty string", () => {
    expect(generateSlug("")).toBe("");
  });

  it("removes multiple consecutive hyphens", () => {
    expect(generateSlug("a   b   c")).toBe("a-b-c");
  });
});

describe("ensureUniqueSlug()", () => {
  it("returns base when not taken", () => {
    expect(ensureUniqueSlug("minha-empresa", [])).toBe("minha-empresa");
  });

  it("appends -2 when base is taken", () => {
    expect(ensureUniqueSlug("empresa", ["empresa"])).toBe("empresa-2");
  });

  it("increments suffix until unique", () => {
    expect(
      ensureUniqueSlug("empresa", ["empresa", "empresa-2", "empresa-3"]),
    ).toBe("empresa-4");
  });
});

describe("isValidSlug()", () => {
  it("accepts valid slugs", () => {
    expect(isValidSlug("minha-empresa")).toBe(true);
    expect(isValidSlug("foo123")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidSlug("")).toBe(false);
  });

  it("rejects slugs longer than 50 chars", () => {
    const long = "a".repeat(51);
    expect(isValidSlug(long)).toBe(false);
  });

  it("rejects slugs with invalid characters", () => {
    expect(isValidSlug("foo bar")).toBe(false);
    expect(isValidSlug("Foo_Bar")).toBe(false);
    expect(isValidSlug("foo!")).toBe(false);
  });

  it("rejects reserved slugs", () => {
    expect(isValidSlug("admin")).toBe(false);
    expect(isValidSlug("api")).toBe(false);
    expect(isValidSlug("login")).toBe(false);
  });
});
