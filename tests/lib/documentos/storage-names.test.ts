import { describe, expect, it } from "vitest";
import {
  decodeName,
  encodeName,
  invalidNameReason,
  parseFolder,
  uniqueName,
} from "@/lib/documentos/storage-names";

const STORAGE_KEY_CHARS = /^[\w/!\-.*'() &$@=;:+,?]*$/;

describe("encodeName/decodeName", () => {
  it.each([
    "Balanço março 2026.xlsx",
    "contrato (final) v2.pdf",
    "a=b;c.txt",
    "100% pago ~ ok.pdf",
    "relatório 📊.pdf",
  ])("ida e volta preserva %s e gera chave aceita pelo Storage", (name) => {
    const key = encodeName(name);
    expect(key).toMatch(STORAGE_KEY_CHARS);
    expect(decodeName(key)).toBe(name);
  });

  it("não mexe em nome só com caracteres seguros", () => {
    expect(encodeName("Extrato-01_jan.pdf")).toBe("Extrato-01_jan.pdf");
  });
});

describe("invalidNameReason", () => {
  it("aceita nome comum", () => {
    expect(invalidNameReason("Financeiro")).toBeNull();
  });
  it.each(["", "   ", ".oculto", "a/b", "a\\b", "x".repeat(121)])(
    "recusa %j",
    (name) => {
      expect(invalidNameReason(name)).not.toBeNull();
    },
  );
});

describe("parseFolder", () => {
  it("raiz é lista vazia", () => {
    expect(parseFolder("")).toEqual([]);
  });
  it("divide subpastas", () => {
    expect(parseFolder("Financeiro/2026")).toEqual(["Financeiro", "2026"]);
  });
  it.each(["../outra-org", "a//b", "/a", ".keep"])("recusa %j", (folder) => {
    expect(parseFolder(folder)).toBeNull();
  });
});

describe("uniqueName", () => {
  it("mantém o nome livre", () => {
    expect(uniqueName("a.pdf", new Set())).toBe("a.pdf");
  });
  it("numera o repetido antes da extensão", () => {
    expect(uniqueName("a.pdf", new Set(["a.pdf", "a (2).pdf"]))).toBe(
      "a (3).pdf",
    );
  });
  it("numera pasta sem extensão", () => {
    expect(uniqueName("Notas", new Set(["Notas"]))).toBe("Notas (2)");
  });
});
