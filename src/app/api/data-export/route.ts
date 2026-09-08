import { NextResponse } from "next/server";
import { exportMyData } from "@/app/actions/data-export";

export async function POST(): Promise<NextResponse> {
  const result = await exportMyData();

  if (!result.success || !result.data) {
    return NextResponse.json(
      { error: result.error ?? "Erro ao gerar exportação" },
      { status: 500 },
    );
  }

  const json = JSON.stringify(result.data, null, 2);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="pulso-export-${Date.now()}.json"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
