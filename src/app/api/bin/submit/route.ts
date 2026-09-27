import { NextResponse } from "next/server";
import { submitBinFromClient } from "@/app/actions/bin";
import type { BinAnswers, BinEventKind } from "@/lib/bin-v2";

const KINDS: BinEventKind[] = ["geral", "setor", "diagnostico"];

function asKind(value: unknown): BinEventKind | null {
  return typeof value === "string" && KINDS.includes(value as BinEventKind)
    ? (value as BinEventKind)
    : null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as {
    slug?: string;
    answers?: BinAnswers;
    event?: { kind?: string; sectionId?: string };
  } | null;

  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  if (!slug || !body?.answers || typeof body.answers !== "object") {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const kind = asKind(body.event?.kind);
  const result = await submitBinFromClient({
    slug,
    answers: body.answers,
    ...(kind
      ? {
          event: {
            kind,
            ...(typeof body.event?.sectionId === "string"
              ? { sectionId: body.event.sectionId }
              : {}),
          },
        }
      : {}),
  });

  if (!result.success) {
    console.error("[bin/submit]", result.error, { slug });
    const status = result.error.includes("Entre no PULSO") ? 401 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, ...result.data });
}
