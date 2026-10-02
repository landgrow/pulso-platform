"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformRole } from "@/lib/supabase/platform-role-server";
import { authorizeOrg } from "@/lib/auth/org-access";
import {
  minBlockByNome,
  minBlockLabel,
  readMinPerguntas,
  type MinPergunta,
} from "@/lib/min/blocks";

type Result<T> = { success: true; data: T } | { success: false; error: string };

export interface MinBlockRecord {
  bloco: string;
  nome: string;
  updatedAt: string;
  perguntas: MinPergunta[];
}

export interface MinSummary {
  clienteId: string | null;
  blocosPreenchidos: number;
  ultimaAtualizacao: string | null;
  blocos: MinBlockRecord[];
}

export interface MinInboxItem {
  id: string;
  orgName: string;
  orgSlug: string;
  href: string;
  nome: string;
  updatedAt: string;
  perguntas: MinPergunta[];
}

async function requireAdminOrConsultant(): Promise<
  | { ok: true; role: "platform_admin" | "consultant"; userId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getPlatformRole(supabase);
  if (!role || !user) {
    return {
      ok: false,
      error: "Acesso negado. Apenas administradores da plataforma.",
    };
  }
  return { ok: true, role, userId: user.id };
}

function asRecords(
  rows: { bloco: string; conteudo: unknown; updated_at: string }[] | null,
): MinBlockRecord[] {
  return (rows ?? []).map((row) => ({
    bloco: row.bloco,
    nome: minBlockLabel(row.bloco),
    updatedAt: row.updated_at,
    perguntas: readMinPerguntas(row.conteudo),
  }));
}

/**
 * Blocos do MIN de UM cliente — o que já chegou do formulário.
 */
export async function getMinSummaryForOrg(
  orgId: string,
): Promise<Result<MinSummary>> {
  const access = await authorizeOrg(orgId);
  if (!access.ok) return { success: false, error: access.error };

  const db = await createAdminClient();

  const { data: cliente } = await db
    .from("clientes")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!cliente) {
    return {
      success: true,
      data: {
        clienteId: null,
        blocosPreenchidos: 0,
        ultimaAtualizacao: null,
        blocos: [],
      },
    };
  }

  const { data: blocos, error: blocosError } = await db
    .from("min_blocos")
    .select("bloco, conteudo, updated_at")
    .eq("cliente_id", cliente.id)
    .order("updated_at", { ascending: false });
  if (blocosError) return { success: false, error: blocosError.message };

  const records = asRecords(blocos);
  return {
    success: true,
    data: {
      clienteId: cliente.id,
      blocosPreenchidos: records.length,
      ultimaAtualizacao: records[0]?.updatedAt ?? null,
      blocos: records,
    },
  };
}

/** Inbox da equipe: cada bloco que o cliente concluiu. */
export async function listRecentMinBlocks(): Promise<Result<MinInboxItem[]>> {
  const gate = await requireAdminOrConsultant();
  if (!gate.ok) return { success: false, error: gate.error };

  const db = await createAdminClient();
  const { data, error } = await db
    .from("min_blocos")
    .select("id, bloco, conteudo, updated_at, clientes!inner(org_id)")
    .order("updated_at", { ascending: false })
    .limit(40);

  if (error) return { success: false, error: error.message };

  type NestedCliente = { org_id: string };
  type Row = {
    id: string;
    bloco: string;
    conteudo: unknown;
    updated_at: string;
    clientes: NestedCliente | NestedCliente[];
  };

  const rows = (data ?? []) as unknown as Row[];
  const orgIds = new Set<string>();
  const orgIdByRow: string[] = [];
  for (const raw of rows) {
    const cliente = Array.isArray(raw.clientes)
      ? raw.clientes[0]
      : raw.clientes;
    const orgId = cliente?.org_id ?? "";
    orgIdByRow.push(orgId);
    if (orgId) orgIds.add(orgId);
  }

  if (gate.role === "consultant") {
    const { data: assigned } = await db
      .from("consultant_assignments")
      .select("org_id")
      .eq("consultant_id", gate.userId);
    const allowed = new Set(
      (assigned ?? []).map((r: { org_id: string }) => r.org_id),
    );
    for (const id of [...orgIds]) if (!allowed.has(id)) orgIds.delete(id);
  }

  const orgById = new Map<string, { name: string; slug: string }>();
  if (orgIds.size > 0) {
    const { data: orgs } = await db
      .from("organizations")
      .select("id, name, slug")
      .in("id", [...orgIds]);
    for (const org of orgs ?? []) {
      orgById.set(org.id, { name: org.name, slug: org.slug });
    }
  }

  const items: MinInboxItem[] = [];
  rows.forEach((row, index) => {
    const org = orgById.get(orgIdByRow[index] ?? "");
    if (!org) return;
    const perguntas = readMinPerguntas(row.conteudo);
    if (perguntas.length === 0) return;
    items.push({
      id: row.id,
      orgName: org.name,
      orgSlug: org.slug,
      href: `/admin/clientes/${org.slug}?tab=min`,
      nome: minBlockLabel(row.bloco),
      updatedAt: row.updated_at,
      perguntas,
    });
  });

  return { success: true, data: items };
}

/**
 * Grava um bloco do MIN na org do cliente (preview ou PULSO) para o HQ ler.
 */
export async function submitMinFromClient(input: {
  slug: string;
  bloco: string;
  perguntas: MinPergunta[];
}): Promise<Result<{ orgSlug: string }>> {
  const catalog = minBlockByNome(input.bloco);
  if (!catalog) {
    return { success: false, error: "Bloco do MIN não reconhecido." };
  }
  const perguntas = input.perguntas
    .map((row) => ({
      prompt: row.prompt.trim(),
      answer: row.answer.trim(),
    }))
    .filter((row) => row.prompt && row.answer);
  if (perguntas.length === 0) {
    return { success: false, error: "O bloco chegou sem respostas." };
  }

  if (JSON.stringify(perguntas).length > 100_000) {
    return { success: false, error: "Respostas grandes demais." };
  }

  const db = await createAdminClient();

  const { data: org } = await db
    .from("organizations")
    .select("id, slug, is_internal")
    .eq("slug", input.slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!org || org.is_internal) {
    return {
      success: false,
      error: `Organização "${input.slug}" não encontrada no HQ.`,
    };
  }

  const auth = await authorizeOrg(org.id, { write: true });
  if (!auth.ok) {
    return {
      success: false,
      error:
        auth.error === "Não autenticado"
          ? "Entre no PULSO para o envio chegar no HQ."
          : auth.error,
    };
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

  const { error } = await db.from("min_blocos").upsert(
    {
      cliente_id: cliente.id,
      fase: catalog.fase,
      bloco: catalog.bloco,
      conteudo: { perguntas },
      maturidade: "rascunho",
      sessao_data: new Date().toISOString(),
    },
    { onConflict: "cliente_id,bloco" },
  );
  if (error) return { success: false, error: error.message };

  return { success: true, data: { orgSlug: org.slug } };
}
