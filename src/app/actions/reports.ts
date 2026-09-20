"use server";

import * as XLSX from "xlsx";
import { getBoardById } from "@/app/actions/boards";
import { getFinanceWorkspace } from "@/app/actions/financeiro";
import { getMetricasGerais } from "@/app/actions/metricas";
import { listWorksmartObjectives } from "@/app/actions/worksmart";
import {
  financePdfBlocks,
  financePdfTitle,
} from "@/lib/reports/finance-report";
import { renderPdfReport } from "@/lib/reports/pdf-document";
import {
  boardToRows,
  metricasToRows,
  rowsToCsv,
} from "@/lib/reports/serialize";
import { worksmartPdfBlocks } from "@/lib/reports/worksmart-report";

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

function pdfFile(filename: string, bytes: Uint8Array): FileResult {
  return {
    success: true,
    filename,
    mime: "application/pdf",
    base64: Buffer.from(bytes).toString("base64"),
  };
}

export async function exportFinanceiroPdf(month?: string): Promise<FileResult> {
  const result = await getFinanceWorkspace(month);
  if (!result.success) return { success: false, error: result.error };
  const stamp = new Date().toISOString().slice(0, 10);
  const bytes = await renderPdfReport({
    title: financePdfTitle(result.data.month),
    subtitle:
      "Livro do mes: entradas, imposto da nota, saidas e balanco. Mesmos numeros das Metricas e do Dashboard.",
    blocks: financePdfBlocks(result.data),
  });
  return pdfFile(`financeiro-${result.data.month}-${stamp}.pdf`, bytes);
}

export async function exportWorksmartPdf(orgId?: string): Promise<FileResult> {
  const result = await listWorksmartObjectives(orgId);
  if (!result.success) return { success: false, error: result.error };
  const stamp = new Date().toISOString().slice(0, 10);
  const scope = orgId ? "organizacao" : "land-grow";
  const bytes = await renderPdfReport({
    title: "Objetivos WorkSmart e resultados",
    subtitle:
      "Cascata SMART, key results (atual / meta) e atividades geradas no Plano de Acao.",
    blocks: worksmartPdfBlocks(result.data),
  });
  return pdfFile(`worksmart-${scope}-${stamp}.pdf`, bytes);
}
