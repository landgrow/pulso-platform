import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/notify/cron-auth";
import { runNotificationJob } from "@/lib/notify/run-job";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const result = await runNotificationJob();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no job";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  return handle(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return handle(request);
}
