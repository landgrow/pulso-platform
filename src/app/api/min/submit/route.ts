import { NextResponse } from "next/server";
import { submitMinFromClient } from "@/app/actions/min";
import type { MinPergunta } from "@/lib/min/blocks";

const MAX_QUESTIONS = 12;
const MAX_TEXT = 4000;

function asPerguntas(value: unknown): MinPergunta[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_QUESTIONS
  ) {
    return null;
  }
  const out: MinPergunta[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") return null;
    const prompt = (row as { prompt?: unknown }).prompt;
    const answer = (row as { answer?: unknown }).answer;
    if (typeof prompt !== "string" || typeof answer !== "string") return null;
    if (prompt.length > MAX_TEXT || answer.length > MAX_TEXT) return null;
    out.push({ prompt, answer });
  }
  return out;
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as {
    slug?: string;
    bloco?: string;
    perguntas?: unknown;
  } | null;

  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const bloco = typeof body?.bloco === "string" ? body.bloco.trim() : "";
  const perguntas = asPerguntas(body?.perguntas);
  if (!slug || !bloco || !perguntas) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const result = await submitMinFromClient({ slug, bloco, perguntas });
  if (!result.success) {
    console.error("[min/submit]", result.error, { slug, bloco });
    const status = result.error.includes("Entre no PULSO") ? 401 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, ...result.data });
}
