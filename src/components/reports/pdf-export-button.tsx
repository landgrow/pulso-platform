"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadBase64File } from "@/lib/reports/download";

type FileResult =
  | { success: true; filename: string; mime: string; base64: string }
  | { success: false; error: string };

export function PdfExportButton({
  label,
  run,
}: {
  label: string;
  run: () => Promise<FileResult>;
}): JSX.Element {
  const [busy, setBusy] = useState(false);

  async function onExport(): Promise<void> {
    setBusy(true);
    const result = await run();
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    downloadBase64File(result.filename, result.mime, result.base64);
    toast.success("PDF baixado.");
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() => void onExport()}
    >
      <FileDown className="h-3.5 w-3.5" />
      {busy ? "Gerando PDF..." : label}
    </Button>
  );
}
