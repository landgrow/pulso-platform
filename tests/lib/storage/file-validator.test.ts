import { describe, it, expect } from "vitest";
import {
  validateFile,
  validateFileList,
  checkMagicNumber,
  sha256,
  tipoFromMime,
  formatValidationError,
  getExtension,
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
} from "@/lib/storage/file-validator";

function makeFile(
  name: string,
  mime: string,
  bytes: Uint8Array | string = "conteudo",
): File {
  const content =
    typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  // .slice() força uma cópia com ArrayBuffer "de verdade" (não ArrayBufferLike/
  // SharedArrayBuffer) — é o que o tipo BlobPart exige do construtor de File.
  return new File([content.slice()], name, { type: mime });
}

const PDF_MAGIC = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34,
]); // "%PDF-1.4"
const XLSX_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]); // ZIP header

describe("getExtension()", () => {
  it("extrai a extensão em minúsculas", () => {
    expect(getExtension("Relatorio.PDF")).toBe("pdf");
  });

  it("retorna string vazia sem extensão", () => {
    expect(getExtension("semextensao")).toBe("");
  });
});

describe("validateFile()", () => {
  it("aceita um PDF dentro do limite de tamanho", () => {
    const file = makeFile("dre.pdf", "application/pdf");
    expect(validateFile(file)).toBeNull();
  });

  it("aceita um xlsx com MIME correto", () => {
    const file = makeFile(
      "planilha.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(validateFile(file)).toBeNull();
  });

  it("rejects arquivo acima de 25MB", () => {
    const bigFile = new File(
      [new ArrayBuffer(MAX_FILE_SIZE + 1)],
      "grande.pdf",
      {
        type: "application/pdf",
      },
    );
    const error = validateFile(bigFile);
    expect(error?.code).toBe("TOO_LARGE");
  });

  it("rejects MIME não suportado (ex.: executável disfarçado)", () => {
    const file = makeFile("virus.pdf", "application/x-msdownload");
    const error = validateFile(file);
    expect(error?.code).toBe("BAD_MIME");
  });

  it("rejects quando a extensão não bate com o MIME (csv com nome .pdf)", () => {
    const file = makeFile("relatorio.pdf", "text/csv");
    const error = validateFile(file);
    expect(error?.code).toBe("BAD_EXTENSION");
  });
});

describe("checkMagicNumber()", () => {
  it("aceita PDF com assinatura %PDF correta", async () => {
    const file = makeFile("dre.pdf", "application/pdf", PDF_MAGIC);
    expect(await checkMagicNumber(file)).toBe(true);
  });

  it("rejects um .pdf cujos bytes não são %PDF (renomeado)", async () => {
    const file = makeFile(
      "fake.pdf",
      "application/pdf",
      "isso nao e um pdf de verdade",
    );
    expect(await checkMagicNumber(file)).toBe(false);
  });

  it("aceita xlsx com assinatura ZIP correta", async () => {
    const file = makeFile(
      "planilha.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      XLSX_MAGIC,
    );
    expect(await checkMagicNumber(file)).toBe(true);
  });

  it("csv não tem checagem de magic number (texto puro) — sempre passa", async () => {
    const file = makeFile("dados.csv", "text/csv", "a,b,c\n1,2,3");
    expect(await checkMagicNumber(file)).toBe(true);
  });
});

describe("sha256()", () => {
  it("gera hash hex de 64 caracteres", async () => {
    const file = makeFile("dre.pdf", "application/pdf", "conteudo qualquer");
    const hash = await sha256(file);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("gera o mesmo hash para o mesmo conteúdo (deduplicação depende disso)", async () => {
    const a = makeFile("a.pdf", "application/pdf", "identico");
    const b = makeFile("b.pdf", "application/pdf", "identico");
    expect(await sha256(a)).toBe(await sha256(b));
  });

  it("gera hashes diferentes para conteúdos diferentes", async () => {
    const a = makeFile("a.pdf", "application/pdf", "conteudo A");
    const b = makeFile("b.pdf", "application/pdf", "conteudo B");
    expect(await sha256(a)).not.toBe(await sha256(b));
  });
});

describe("validateFileList()", () => {
  it("aceita uma lista dentro do limite de arquivos", () => {
    const files = Array.from({ length: MAX_FILES_PER_UPLOAD }, (_, i) =>
      makeFile(`f${i}.pdf`, "application/pdf"),
    );
    expect(validateFileList(files)).toBeNull();
  });

  it("rejects mais que o limite de arquivos por envio", () => {
    const files = Array.from({ length: MAX_FILES_PER_UPLOAD + 1 }, (_, i) =>
      makeFile(`f${i}.pdf`, "application/pdf"),
    );
    expect(validateFileList(files)?.code).toBe("TOO_MANY_FILES");
  });

  it("rejects quando o total ultrapassa o limite agregado", () => {
    const files = [
      new File([new ArrayBuffer(60 * 1024 * 1024)], "a.pdf", {
        type: "application/pdf",
      }),
      new File([new ArrayBuffer(60 * 1024 * 1024)], "b.pdf", {
        type: "application/pdf",
      }),
    ];
    expect(validateFileList(files)?.code).toBe("TOTAL_TOO_LARGE");
  });
});

describe("tipoFromMime()", () => {
  it("identifica pdf, excel, csv e outro", () => {
    expect(tipoFromMime("application/pdf")).toBe("pdf");
    expect(
      tipoFromMime(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe("excel");
    expect(tipoFromMime("application/vnd.ms-excel")).toBe("excel");
    expect(tipoFromMime("text/csv")).toBe("csv");
    expect(tipoFromMime("application/zip")).toBe("outro");
  });
});

describe("formatValidationError()", () => {
  it("formata cada tipo de erro em uma mensagem legível em PT-BR", () => {
    expect(
      formatValidationError({ code: "TOO_LARGE", maxBytes: MAX_FILE_SIZE }),
    ).toContain("25MB");
    expect(formatValidationError({ code: "BAD_MIME", accepted: [] })).toContain(
      "não suportado",
    );
    expect(formatValidationError({ code: "BAD_EXTENSION" })).toContain(
      "extensão",
    );
    expect(formatValidationError({ code: "BAD_MAGIC" })).toContain("conteúdo");
    expect(formatValidationError({ code: "TOO_MANY_FILES", max: 5 })).toContain(
      "5 arquivos",
    );
    expect(
      formatValidationError({
        code: "TOTAL_TOO_LARGE",
        maxBytes: 100 * 1024 * 1024,
      }),
    ).toContain("100MB");
  });
});
