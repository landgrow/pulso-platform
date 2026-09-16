"use server";

import * as XLSX from "xlsx";
import { getBoardById } from "@/app/actions/boards";
import { getMetricasGerais } from "@/app/actions/metricas";
import {
  boardToRows,
  metricasToRows,
  rowsToCsv,
} from "@/lib/reports/serialize";

type FileResult =
  | { success: true; filename: string; mime: string; base64: string }
  | { success: false; error: string };

function xlsxBase64(
  sheets: { name: string; rows: Array<Record<string, string | number>> }[],
): string {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  return XLSX.write(workbook, { bookType: "xlsx", type: "base64" }) as string;
}

export async function exportBoardReport(
  boardId: string,
  format: "csv" | "xlsx" = "xlsx",
): Promise<FileResult> {
  const result = await getBoardById(boardId);
  if (!result.success) return { success: false, error: result.error };
  const rows = boardToRows(result.data);
  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = result.data.name.replace(/[^\w\-]+/g, "_").slice(0, 40);

  if (format === "csv") {
    const csv = rowsToCsv(rows);
    return {
      success: true,
      filename: `kanban-${safeName}-${stamp}.csv`,
      mime: "text/csv;charset=utf-8",
      base64: Buffer.from(csv, "utf8").toString("base64"),
    };
  }

  return {
    success: true,
    filename: `kanban-${safeName}-${stamp}.xlsx`,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    base64: xlsxBase64([
      {
        name: "Kanban",
        rows: rows as unknown as Array<Record<string, string | number>>,
      },
    ]),
  };
}

export async function exportMetricasReport(): Promise<FileResult> {
  const result = await getMetricasGerais();
  if (!result.success) return { success: false, error: result.error };
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    success: true,
    filename: `metricas-land-grow-${stamp}.xlsx`,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    base64: xlsxBase64([
      { name: "Indicadores", rows: metricasToRows(result.data) },
    ]),
  };
}
