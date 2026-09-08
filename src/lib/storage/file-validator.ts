/**
 * Validação de arquivos de evidência (PDF/Excel/CSV) — client-side.
 * Espelha os limites e MIME types configurados no bucket `evidencias`
 * (db/migrations/0006_storage_evidencias.sql) — mudar um lado sem o outro
 * quebra a consistência entre o que a UI aceita e o que o Storage aceita.
 */

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — igual ao file_size_limit do bucket
export const MAX_FILES_PER_UPLOAD = 5;
export const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB por sessão de upload

export const ACCEPTED_MIMES = [
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
] as const;

export type AcceptedMime = (typeof ACCEPTED_MIMES)[number];

const EXTENSION_TO_MIMES: Record<string, readonly string[]> = {
  pdf: ["application/pdf"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  xls: ["application/vnd.ms-excel"],
  csv: ["text/csv"],
};

// Magic number (primeiros bytes) por extensão — null = sem assinatura binária confiável (texto puro).
const MAGIC_NUMBERS: Record<string, number[] | null> = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  xlsx: [0x50, 0x4b, 0x03, 0x04], // ZIP (xlsx é um zip por dentro)
  xls: [0xd0, 0xcf, 0x11, 0xe0], // OLE2 Compound Document (Excel binário antigo)
  csv: null,
};

export type FileValidationError =
  | { code: "TOO_LARGE"; maxBytes: number }
  | { code: "BAD_MIME"; accepted: readonly string[] }
  | { code: "BAD_EXTENSION" }
  | { code: "BAD_MAGIC" };

export type FileListValidationError =
  | { code: "TOO_MANY_FILES"; max: number }
  | { code: "TOTAL_TOO_LARGE"; maxBytes: number };

export function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex <= 0) return ""; // sem ponto, ou ponto só no início (dotfile)
  return filename.slice(dotIndex + 1).toLowerCase();
}

/**
 * Validação síncrona: tamanho, MIME, e coerência MIME↔extensão.
 * Não checa magic number aqui — isso é assíncrono, ver `checkMagicNumber`.
 */
export function validateFile(file: File): FileValidationError | null {
  if (file.size > MAX_FILE_SIZE) {
    return { code: "TOO_LARGE", maxBytes: MAX_FILE_SIZE };
  }

  if (!ACCEPTED_MIMES.includes(file.type as AcceptedMime)) {
    return { code: "BAD_MIME", accepted: ACCEPTED_MIMES };
  }

  const ext = getExtension(file.name);
  const validMimes = EXTENSION_TO_MIMES[ext];
  if (!validMimes || !validMimes.includes(file.type)) {
    return { code: "BAD_EXTENSION" };
  }

  return null;
}

/**
 * Checa os primeiros bytes do arquivo contra a assinatura esperada do tipo.
 * Pega o caso clássico de renomear um .exe pra .pdf — o MIME do navegador
 * é só o que o SO diz que é, não prova nada sozinho.
 */
export async function checkMagicNumber(file: File): Promise<boolean> {
  const ext = getExtension(file.name);
  const expected = MAGIC_NUMBERS[ext];
  if (expected === undefined || expected === null) return true;

  const buffer = new Uint8Array(
    await file.slice(0, expected.length).arrayBuffer(),
  );
  return expected.every((byte, i) => buffer[i] === byte);
}

/** SHA-256 do conteúdo do arquivo, em hex — usado pra deduplicação. */
export async function sha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Valida a lista inteira de arquivos de uma sessão de upload (limites agregados). */
export function validateFileList(
  files: File[],
): FileListValidationError | null {
  if (files.length > MAX_FILES_PER_UPLOAD) {
    return { code: "TOO_MANY_FILES", max: MAX_FILES_PER_UPLOAD };
  }
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_TOTAL_SIZE) {
    return { code: "TOTAL_TOO_LARGE", maxBytes: MAX_TOTAL_SIZE };
  }
  return null;
}

export type EvidenciaTipo = "pdf" | "excel" | "csv" | "audio" | "outro";

export function tipoFromMime(mime: string): EvidenciaTipo {
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "excel";
  if (mime === "text/csv") return "csv";
  return "outro";
}

/** Mensagens de erro em PT-BR para exibir na UI. */
export function formatValidationError(
  error: FileValidationError | FileListValidationError,
): string {
  switch (error.code) {
    case "TOO_LARGE":
      return `Arquivo maior que ${Math.round(error.maxBytes / 1024 / 1024)}MB.`;
    case "BAD_MIME":
      return "Tipo de arquivo não suportado. Aceitos: PDF, Excel (.xlsx/.xls), CSV.";
    case "BAD_EXTENSION":
      return "A extensão do arquivo não corresponde ao tipo detectado.";
    case "BAD_MAGIC":
      return "O conteúdo do arquivo não corresponde à extensão informada.";
    case "TOO_MANY_FILES":
      return `No máximo ${error.max} arquivos por envio.`;
    case "TOTAL_TOO_LARGE":
      return `Tamanho total acima de ${Math.round(error.maxBytes / 1024 / 1024)}MB.`;
  }
}
