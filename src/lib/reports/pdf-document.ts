import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const NAVY = rgb(0.067, 0.094, 0.118);
const MUTED = rgb(0.36, 0.4, 0.53);
const LINE = rgb(0.85, 0.87, 0.92);
const INK = rgb(0.1, 0.14, 0.25);

export type PdfBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "kpi"; items: Array<{ label: string; value: string }> }
  | { type: "table"; headers: string[]; rows: string[][] };

export async function renderPdfReport(input: {
  title: string;
  subtitle: string;
  blocks: PdfBlock[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const stamp = new Date().toLocaleString("pt-BR");

  let page = doc.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN;

  const ensure = (need: number): void => {
    if (y - need >= MARGIN + 28) return;
    drawFooter(page, regular, stamp);
    page = doc.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - MARGIN;
  };

  page.drawText("PULSO  ·  Land Grow", {
    x: MARGIN,
    y,
    size: 9,
    font: bold,
    color: MUTED,
  });
  y -= 22;
  wrap(page, bold, input.title, 18, NAVY, () => {
    ensure(22);
  }).forEach((line) => {
    page.drawText(line, { x: MARGIN, y, size: 18, font: bold, color: NAVY });
    y -= 22;
  });
  wrap(page, regular, input.subtitle, 10, MUTED, () => ensure(14)).forEach(
    (line) => {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 10,
        font: regular,
        color: MUTED,
      });
      y -= 14;
    },
  );
  y -= 10;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE.width - MARGIN, y },
    thickness: 1,
    color: LINE,
  });
  y -= 20;

  for (const block of input.blocks) {
    if (block.type === "h1") {
      ensure(28);
      page.drawText(safe(block.text), {
        x: MARGIN,
        y,
        size: 13,
        font: bold,
        color: NAVY,
      });
      y -= 20;
    } else if (block.type === "h2") {
      ensure(22);
      page.drawText(safe(block.text), {
        x: MARGIN,
        y,
        size: 11,
        font: bold,
        color: INK,
      });
      y -= 16;
    } else if (block.type === "p") {
      const lines = wrap(page, regular, block.text, 10, INK, () => ensure(13));
      for (const line of lines) {
        ensure(13);
        page.drawText(line, {
          x: MARGIN,
          y,
          size: 10,
          font: regular,
          color: INK,
        });
        y -= 13;
      }
      y -= 6;
    } else if (block.type === "kpi") {
      const cols = Math.min(4, Math.max(1, block.items.length));
      const gap = 8;
      const boxW = (PAGE.width - MARGIN * 2 - gap * (cols - 1)) / cols;
      ensure(52);
      block.items.forEach((item, index) => {
        const x = MARGIN + (index % cols) * (boxW + gap);
        if (index > 0 && index % cols === 0) {
          y -= 52;
          ensure(52);
        }
        const rowY = y;
        page.drawRectangle({
          x,
          y: rowY - 40,
          width: boxW,
          height: 44,
          borderColor: LINE,
          borderWidth: 1,
        });
        page.drawText(safe(item.label).slice(0, 28), {
          x: x + 8,
          y: rowY - 14,
          size: 8,
          font: regular,
          color: MUTED,
        });
        page.drawText(safe(item.value).slice(0, 22), {
          x: x + 8,
          y: rowY - 32,
          size: 11,
          font: bold,
          color: NAVY,
        });
      });
      y -= 56;
    } else {
      const colW =
        (PAGE.width - MARGIN * 2) / Math.max(1, block.headers.length);
      ensure(18);
      block.headers.forEach((header, index) => {
        page.drawText(safe(header).slice(0, 24), {
          x: MARGIN + index * colW,
          y,
          size: 8,
          font: bold,
          color: MUTED,
        });
      });
      y -= 14;
      page.drawLine({
        start: { x: MARGIN, y: y + 8 },
        end: { x: PAGE.width - MARGIN, y: y + 8 },
        thickness: 0.6,
        color: LINE,
      });
      for (const row of block.rows) {
        ensure(16);
        row.forEach((cell, index) => {
          page.drawText(safe(cell).slice(0, 32), {
            x: MARGIN + index * colW,
            y,
            size: 8,
            font: regular,
            color: INK,
          });
        });
        y -= 13;
      }
      y -= 10;
    }
  }

  drawFooter(page, regular, stamp);
  return doc.save();
}

function drawFooter(page: PDFPage, font: PDFFont, stamp: string): void {
  page.drawText(
    `Uso interno Land Grow  ·  gerado em ${stamp}  ·  dados sob RLS e LGPD`,
    {
      x: MARGIN,
      y: 28,
      size: 8,
      font,
      color: MUTED,
    },
  );
}

function wrap(
  page: PDFPage,
  font: PDFFont,
  text: string,
  size: number,
  _color: ReturnType<typeof rgb>,
  beforeLine: () => void,
): string[] {
  const max = PAGE.width - MARGIN * 2;
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length === 0) lines.push("—");
  beforeLine();
  void page;
  return lines;
}

/** Helvetica (WinAnsi) drops unsupported glyphs instead of crashing. */
function safe(value: string): string {
  return value
    .replaceAll("\u2212", "-")
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("·", "-")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("’", "'");
}
