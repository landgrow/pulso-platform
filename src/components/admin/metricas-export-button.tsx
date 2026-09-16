"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportMetricasReport } from "@/app/actions/reports";
import { downloadBase64File } from "@/lib/reports/download";

export function MetricasExportButton(): JSX.Element {
  const [busy, setBusy] = useState(false);

  async function onExport(): Promise<void> {
    setBusy(true);
    const result = await exportMetricasReport();
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    downloadBase64File(result.filename, result.mime, result.base64);
    toast.success("Relatório de métricas baixado.");
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
      Exportar relatório
    </Button>
  );
}
