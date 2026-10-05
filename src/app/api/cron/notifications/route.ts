import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/notify/cron-auth";
import { runNotificationJob } from "@/lib/notify/run-job";
import { isDigestHour } from "@/lib/notify/calendar";
import { sendMeetingReminders } from "@/lib/meetings/send-invites";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const now = new Date();
    // Lembrete de reunião (1h antes) roda em toda execução do cron; o resumo
    // diário só na hora do resumo (o cron pode rodar a cada 15 min).
    const reminders = await sendMeetingReminders(now);
    const result = isDigestHour(now) ? await runNotificationJob(now) : null;
    return NextResponse.json({ ok: true, reminders, ...(result ?? {}) });
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
