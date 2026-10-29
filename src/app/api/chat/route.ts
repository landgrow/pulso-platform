import { convertToModelMessages, streamText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPlatformRole,
  getStaffCapabilities,
} from "@/lib/supabase/platform-role-server";
import { authorizeOrg, authorizeClientSlug } from "@/lib/auth/org-access";
import { listClientDirectory } from "@/app/actions/clientes";
import {
  loadCarteiraContext,
  loadOrgContextPack,
  renderOrgContext,
} from "@/lib/inteligencia/org-context";
import {
  pulsoChatDossier,
  pulsoChatSystem,
  resolveLlm,
} from "@/lib/inteligencia/llm";
import { sanitizeChatMessages } from "@/lib/inteligencia/chat-guard";
import { isRateLimitedBy } from "@/lib/supabase/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cada pergunta custa tokens: limite por pessoa contra rajada e uso abusivo.
const PER_MINUTE = { max: 8, windowMs: 60 * 1000 };
const PER_HOUR = { max: 60, windowMs: 60 * 60 * 1000 };

export async function POST(request: Request): Promise<Response> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Entre no PULSO." }, { status: 401 });
  }

  if (
    isRateLimitedBy(`chat:${user.id}`, PER_MINUTE) ||
    isRateLimitedBy(`chat:${user.id}`, PER_HOUR)
  ) {
    return NextResponse.json(
      { error: "Muitas perguntas seguidas. Espere um pouco e tente de novo." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    messages?: unknown;
    surface?: string;
    orgId?: string | null;
    slug?: string | null;
  } | null;

  const guarded = sanitizeChatMessages(body?.messages);
  if (!guarded.ok) {
    return NextResponse.json({ error: guarded.error }, { status: 400 });
  }
  const messages = guarded.messages;

  const llm = resolveLlm();
  if ("error" in llm) {
    return NextResponse.json({ error: llm.error }, { status: 503 });
  }

  const role = await getPlatformRole(userClient);
  const surface = body?.surface === "admin" ? "admin" : "client";
  let context = "";

  if (surface === "admin") {
    if (!role) {
      return NextResponse.json(
        { error: "Só a equipe Land Grow." },
        { status: 403 },
      );
    }
    const caps = await getStaffCapabilities(userClient);
    if (
      !caps.includes("painel") &&
      !caps.includes("bin") &&
      !caps.includes("clientes")
    ) {
      return NextResponse.json(
        { error: "Sem acesso à Central IA." },
        { status: 403 },
      );
    }
    const orgId =
      typeof body?.orgId === "string" && body.orgId.length > 0
        ? body.orgId
        : null;
    if (orgId) {
      const auth = await authorizeOrg(orgId);
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: 403 });
      }
      const pack = await loadOrgContextPack(orgId);
      if (!pack) {
        return NextResponse.json(
          { error: "Empresa sem dossiê (org interna?)." },
          { status: 400 },
        );
      }
      context = renderOrgContext(pack);
    } else {
      const directory = await listClientDirectory();
      if (!directory.success) {
        return NextResponse.json({ error: directory.error }, { status: 400 });
      }
      context = await loadCarteiraContext(
        directory.data
          .filter((row) => !row.deleted_at)
          .map((row) => row.org_id),
      );
    }
  } else {
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
    }
    const auth = await authorizeClientSlug(slug);
    if (!auth.ok) {
      return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
    }
    const pack = await loadOrgContextPack(auth.org.id);
    if (!pack) {
      return NextResponse.json({ error: "Sem dossiê." }, { status: 400 });
    }
    context = renderOrgContext(pack);
  }

  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model: llm.model,
    system: pulsoChatSystem({ surface }),
    messages: [
      { role: "user", content: pulsoChatDossier(context) },
      ...modelMessages,
    ],
    temperature: 0.2,
    maxOutputTokens: 900,
  });

  return result.toUIMessageStreamResponse();
}
