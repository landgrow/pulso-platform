import { describe, it, expect } from "vitest";
import {
  cn,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  getInitials,
  capitalize,
  generateId,
  sleep,
} from "@/lib/utils";

describe("cn()", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters falsy values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", true && "active", false && "inactive")).toBe(
      "base active",
    );
  });
});

describe("formatCurrency()", () => {
  it("formats BRL currency", () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain("R$");
    expect(result).toContain("1.234,56");
  });

  it("handles zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("R$");
    expect(result).toContain("0,00");
  });

  it("handles negative values", () => {
    const result = formatCurrency(-100);
    expect(result).toContain("100,00");
  });
});

describe("formatDate()", () => {
  it("formats ISO string to pt-BR", () => {
    // Use noon UTC to avoid timezone shift
    const result = formatDate("2026-09-05T12:00:00Z");
    expect(result).toMatch(/5 de set\. de 2026|05 de set\. de 2026/);
  });

  it("accepts Date object", () => {
    const result = formatDate(new Date(2026, 8, 5)); // local noon
    expect(result).toContain("2026");
  });
});

describe("formatNumber()", () => {
  it("formats with pt-BR thousands separator", () => {
    expect(formatNumber(1234)).toBe("1.234");
    expect(formatNumber(1234567)).toBe("1.234.567");
  });
});

describe("formatPercent()", () => {
  it("formats percentage with default decimals", () => {
    expect(formatPercent(75)).toBe("75.0%");
    expect(formatPercent(75.5)).toBe("75.5%");
  });

  it("respects decimals parameter", () => {
    expect(formatPercent(75.123, 0)).toBe("75%");
    expect(formatPercent(75.123, 2)).toBe("75.12%");
  });
});

describe("getInitials()", () => {
  it("extracts first letter of each word", () => {
    expect(getInitials("João Silva")).toBe("JS");
    expect(getInitials("Maria de Souza")).toBe("MD");
  });

  it("limits to 2 characters", () => {
    expect(getInitials("A B C D")).toBe("AB");
  });

  it("uppercases the result", () => {
    expect(getInitials("alice")).toBe("A");
  });
});

describe("capitalize()", () => {
  it("capitalizes first letter of each word", () => {
    expect(capitalize("hello world")).toBe("Hello World");
  });

  it("preserves other lowercase letters", () => {
    expect(capitalize("foo bar")).toBe("Foo Bar");
  });
});

describe("generateId()", () => {
  it("returns a UUID v4", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("returns unique ids", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});

describe("sleep()", () => {
  it("delays execution for given ms", async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });
});
