"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformRole } from "@/lib/supabase/platform-role-server";
import { dispatchBinEvent } from "@/lib/notify/dispatch-bin";
import {
  BIN_V2_INSTRUMENT,
  appendBinEvent,
  binInboxItemsFromRows,
  binProgressFromPayload,
  binRouteLabel,
  getBinSection,
  pruneHiddenAnswers,
  readBinFlow,
  resolveBinRoute,
} from "@/lib/bin-v2";
import type {
  BinAnswers,
  BinEventKind,
  BinFlowMeta,
  BinInboxItem,
  BinRoute,
} from "@/lib/bin-v2";

type Result<T> = { success: true; data: T } | { success: false; error: string };

export interface BinSummary {
  clienteId: string | null;
  periodoLabel: string | null;
  progresso: number | null;
  payload: Partial<BinAnswers> | null;
  route: BinRoute | null;
  flow: BinFlowMeta;
}

export type { BinInboxItem };

async function requireAdminOrConsultant(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const role = await getPlatformRole(supabase);
  if (!role) {
    return {
      ok: false,
      error: "Acesso negado. Apenas administradores da plataforma.",
    };
  }
  return { ok: true };
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function fichaHref(slug: string): string {
  return `/admin/clientes/${slug}#bin`;
}

/**
 * Resumo do formulário BIN (período mais recente) de UM cliente — usado
 * dentro do painel de detalhe de /admin/clientes/[slug]. É daqui que a
 * Land Grow lê as respostas e faz o diagnóstico.
 */
export async function getBinSummaryForOrg(
  orgId: string,
): Promise<Result<BinSummary>> {
  const gate = await requireAdminOrConsultant();
  if (!gate.ok) return { success: false, error: gate.error };

  const empty: BinSummary = {
    clienteId: null,
    periodoLabel: null,
    progresso: null,
    payload: null,
    route: null,
    flow: readBinFlow(undefined),
  };

  const db = await createAdminClient();

  const { data: cliente } = await db
    .from("clientes")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!cliente) {
    return { success: true, data: empty };
  }

  const { data: periodo } = await db
    .from("periodos_dados")
    .select("id, mes, ano")
    .eq("cliente_id", cliente.id)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!periodo) {
    return {
      success: true,
      data: { ...empty, clienteId: cliente.id },
    };
  }

  const { data: colecao } = await db
    .from("colecoes")
    .select("payload, metadata")
    .eq("periodo_id", periodo.id)
    .eq("tipo", "formulario")
    .maybeSingle();

  const payload = (colecao?.payload as Partial<BinAnswers>) ?? null;
  const metadata = (colecao?.metadata ?? undefined) as
    Record<string, unknown> | undefined;
  const answers = (payload ?? {}) as BinAnswers;

  return {
    success: true,
    data: {
      clienteId: cliente.id,
      periodoLabel: `${String(periodo.mes).padStart(2, "0")}/${periodo.ano}`,
      progresso: payload ? binProgressFromPayload(payload) : null,
      payload,
      route: resolveBinRoute(answers),
      flow: readBinFlow(metadata),
    },
  };
}

/** Inbox da equipe: o que o cliente enviou (geral, setor, BIN completo). */
export async function listRecentBinEvents(): Promise<Result<BinInboxItem[]>> {
  const gate = await requireAdminOrConsultant();
  if (!gate.ok) return { success: false, error: gate.error };

  const db = await createAdminClient();
  const { data, error } = await db
    .from("colecoes")
    .select(
      "metadata, payload, updated_at, periodos_dados!inner(cliente_id, clientes!inner(org_id))",
    )
    .eq("tipo", "formulario")
    .order("updated_at", { ascending: false })
    .limit(80);

  if (error) {
    return { success: false, error: error.message };
  }

  type NestedCliente = { org_id: string };
  type NestedPeriodo = { clientes: NestedCliente | NestedCliente[] };
  type Row = {
    metadata: Record<string, unknown> | null;
    payload: unknown;
    updated_at: string;
    periodos_dados: NestedPeriodo | NestedPeriodo[];
  };

  const rows = (data ?? []) as unknown as Row[];
  const orgIds = new Set<string>();
  const orgIdByRow: string[] = [];
  for (const raw of rows) {
    const periodo = Array.isArray(raw.periodos_dados)
      ? raw.periodos_dados[0]
      : raw.periodos_dados;
    const cliente = periodo
      ? Array.isArray(periodo.clientes)
        ? periodo.clientes[0]
        : periodo.clientes
      : null;
    const orgId = cliente?.org_id ?? "";
    orgIdByRow.push(orgId);
    if (orgId) orgIds.add(orgId);
  }

  type OrgRow = {
    id: string;
    name: string;
    slug: string;
    is_internal: boolean | null;
  };
  let orgs: OrgRow[] = [];
  if (orgIds.size > 0) {
    const orgRes = await db
      .from("organizations")
      .select("id, name, slug, is_internal")
      .in("id", [...orgIds]);
    orgs = (orgRes.data ?? []) as OrgRow[];
  }

  const orgById = new Map(orgs.map((org) => [org.id, org]));
  const inboxRows = rows.flatMap((raw, index) => {
    const org = orgById.get(orgIdByRow[index] ?? "");
    if (!org) return [];
    return [
      {
        metadata: raw.metadata,
        payload: raw.payload,
        updatedAt: raw.updated_at,
        orgName: org.name,
        orgSlug: org.slug,
        isInternal: Boolean(org.is_internal),
      },
    ];
  });

  return { success: true, data: binInboxItemsFromRows(inboxRows) };
}

export async function notifyBinSubmission(input: {
  periodoId: string;
  kind: BinEventKind;
  sectionId?: string;
}): Promise<Result<{ emailed: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const { data: periodo, error } = await supabase
    .from("periodos_dados")
    .select("id, clientes!inner(org_id)")
    .eq("id", input.periodoId)
    .maybeSingle();

  if (error || !periodo) {
    return { success: false, error: "Período não encontrado" };
  }

  const clienteJoin = periodo.clientes as
    { org_id: string } | Array<{ org_id: string }> | null;
  const cliente = Array.isArray(clienteJoin) ? clienteJoin[0] : clienteJoin;
  if (!cliente?.org_id) {
    return { success: false, error: "Organização não encontrada" };
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", cliente.org_id)
    .maybeSingle();
  if (!org) {
    return { success: false, error: "Organização não encontrada" };
  }

  const { data: colecao } = await supabase
    .from("colecoes")
    .select("payload, metadata")
    .eq("periodo_id", input.periodoId)
    .eq("tipo", "formulario")
    .maybeSingle();

  const answers = (colecao?.payload ?? {}) as BinAnswers;
  const route = resolveBinRoute(answers);
  const section = input.sectionId ? getBinSection(input.sectionId) : undefined;
  const actorName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Cliente";

  await dispatchBinEvent({
    orgId: cliente.org_id,
    orgName: org.name,
    orgSlug: org.slug,
    actorId: user.id,
    actorName,
    kind: input.kind,
    routeLabel: binRouteLabel(route),
    entityKey: `${input.periodoId}:${input.kind}:${input.sectionId ?? "all"}:${Date.now()}`,
    href: `${appUrl()}${fichaHref(org.slug)}`,
    ...(section ? { sectionTitle: section.title } : {}),
  });

  return { success: true, data: { emailed: true } };
}

/**
 * Grava o BIN numa org cliente (preview ou PULSO do cliente) e avisa o HQ.
 */
export async function submitBinFromClient(input: {
  slug: string;
  answers: BinAnswers;
  event?: { kind: BinEventKind; sectionId?: string };
}): Promise<Result<{ orgSlug: string; periodId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      error: "Entre no PULSO para o envio chegar no HQ.",
    };
  }

  const role = await getPlatformRole(supabase);
  const admin = await createAdminClient();
  const db = role ? admin : supabase;

  const { data: org } = await db
    .from("organizations")
    .select("id, name, slug, is_internal")
    .eq("slug", input.slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!org || org.is_internal) {
    return {
      success: false,
      error: `Organização "${input.slug}" não encontrada no HQ.`,
    };
  }

  if (!role) {
    const { data: member } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("org_id", org.id)
      .maybeSingle();
    if (!member) {
      return { success: false, error: "Sem acesso a esta organização." };
    }
  }

  const { data: cliente } = await db
    .from("clientes")
    .select("id")
    .eq("org_id", org.id)
    .maybeSingle();
  if (!cliente) {
    return {
      success: false,
      error: "Cliente não encontrado para esta organização.",
    };
  }

  const now = new Date();
  const mes = now.getMonth() + 1;
  const ano = now.getFullYear();
  const { data: existingPeriod } = await db
    .from("periodos_dados")
    .select("id")
    .eq("cliente_id", cliente.id)
    .eq("mes", mes)
    .eq("ano", ano)
    .maybeSingle();

  let periodId = existingPeriod?.id ?? null;
  if (!periodId) {
    const created = await db
      .from("periodos_dados")
      .insert({
        cliente_id: cliente.id,
        mes,
        ano,
        status: "em_coleta",
      })
      .select("id")
      .single();
    if (created.error || !created.data) {
      return {
        success: false,
        error: created.error?.message ?? "Não deu para abrir o período.",
      };
    }
    periodId = created.data.id;
  }

  const { data: colecao } = await db
    .from("colecoes")
    .select("id, metadata")
    .eq("periodo_id", periodId)
    .eq("tipo", "formulario")
    .maybeSingle();

  const answers = pruneHiddenAnswers(input.answers);
  const route = resolveBinRoute(answers);
  let flow = readBinFlow(
    (colecao?.metadata ?? undefined) as Record<string, unknown> | undefined,
  );
  if (input.event) {
    flow = appendBinEvent(flow, {
      at: new Date().toISOString(),
      kind: input.event.kind,
      route,
      ...(input.event.sectionId ? { sectionId: input.event.sectionId } : {}),
    });
  }

  const metadata = {
    area: "formulario",
    instrument: BIN_V2_INSTRUMENT,
    route,
    geralEnviadoEm: flow.geralEnviadoEm,
    diagnosticoEnviadoEm: flow.diagnosticoEnviadoEm,
    setoresEnviados: flow.setoresEnviados,
    events: flow.events,
  };

  if (colecao) {
    const { error } = await db
      .from("colecoes")
      .update({
        payload: answers,
        metadata,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", colecao.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await db.from("colecoes").insert({
      periodo_id: periodId,
      tipo: "formulario",
      payload: answers,
      metadata,
      created_by: user.id,
      updated_by: user.id,
      status: "rascunho",
    });
    if (error) return { success: false, error: error.message };
  }

  if (input.event) {
    await notifyBinSubmission({
      periodoId: periodId,
      kind: input.event.kind,
      ...(input.event.sectionId ? { sectionId: input.event.sectionId } : {}),
    });
  }

  return { success: true, data: { orgSlug: org.slug, periodId } };
}
