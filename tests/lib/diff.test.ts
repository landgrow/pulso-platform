import { describe, it, expect } from "vitest";
import { diffFields, changedKeys, diffText } from "@/lib/diff";

describe("diffFields", () => {
  it("detecta campo alterado", () => {
    const result = diffFields(
      { fin_faturamento: 100 },
      { fin_faturamento: 200 },
    );
    expect(result).toEqual([
      { key: "fin_faturamento", status: "changed", before: 100, after: 200 },
    ]);
  });

  it("detecta campo adicionado", () => {
    const result = diffFields({}, { area: "Financeiro" });
    expect(result).toEqual([
      { key: "area", status: "added", before: undefined, after: "Financeiro" },
    ]);
  });

  it("detecta campo removido", () => {
    const result = diffFields({ area: "Financeiro" }, {});
    expect(result).toEqual([
      {
        key: "area",
        status: "removed",
        before: "Financeiro",
        after: undefined,
      },
    ]);
  });

  it("ignora campos idênticos", () => {
    const result = diffFields({ a: 1, b: "x" }, { a: 1, b: "x" });
    expect(result).toEqual([]);
  });

  it("compara objetos aninhados por valor (JSON), não por referência", () => {
    const result = diffFields({ opcoes: { x: 1 } }, { opcoes: { x: 1 } });
    expect(result).toEqual([]);
  });

  it("ordena o resultado por chave", () => {
    const result = diffFields({ z: 1, a: 1 }, { z: 2, a: 2 });
    expect(result.map((f) => f.key)).toEqual(["a", "z"]);
  });

  it("lida com múltiplas mudanças simultâneas (add + remove + changed)", () => {
    const result = diffFields(
      { old_field: 1, kept: "a" },
      { kept: "b", new_field: 2 },
    );
    expect(result).toEqual([
      { key: "kept", status: "changed", before: "a", after: "b" },
      { key: "new_field", status: "added", before: undefined, after: 2 },
      { key: "old_field", status: "removed", before: 1, after: undefined },
    ]);
  });
});

describe("changedKeys", () => {
  it("retorna só as chaves alteradas, sem valores", () => {
    expect(changedKeys({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 })).toEqual([
      "b",
      "c",
    ]);
  });

  it("retorna array vazio quando nada mudou", () => {
    expect(changedKeys({ a: 1 }, { a: 1 })).toEqual([]);
  });
});

describe("diffText", () => {
  it("marca linha adicionada", () => {
    const parts = diffText("linha 1", "linha 1\nlinha 2");
    expect(parts.some((p) => p.added && p.value.includes("linha 2"))).toBe(
      true,
    );
  });

  it("marca linha removida", () => {
    const parts = diffText("linha 1\nlinha 2", "linha 1");
    expect(parts.some((p) => p.removed && p.value.includes("linha 2"))).toBe(
      true,
    );
  });

  it("não marca nada quando o texto é idêntico", () => {
    const parts = diffText("mesmo texto", "mesmo texto");
    expect(parts.every((p) => !p.added && !p.removed)).toBe(true);
  });
});
