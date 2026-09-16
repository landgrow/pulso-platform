"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportBoardReport } from "@/app/actions/reports";
import { downloadBase64File } from "@/lib/reports/download";

export function BoardExportButton({
  boardId,
}: {
  boardId: string;
}): JSX.Element {
  const [busy, setBusy] = useState(false);

  async function onExport(): Promise<void> {
    setBusy(true);
    const result = await exportBoardReport(boardId, "xlsx");
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    downloadBase64File(result.filename, result.mime, result.base64);
    toast.success("Relatório do kanban baixado.");
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() => void onExport()}
    >
      <Download className="h-3.5 w-3.5" />
      Exportar
    </Button>
  );
}
