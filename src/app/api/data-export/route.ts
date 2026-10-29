import { NextResponse } from "next/server";
import { exportMyData } from "@/app/actions/data-export";

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const app = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (app && origin.replace(/\/$/, "") === app) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }

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
