"use server";

import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/platform-role-server";
import { addDaysIso, dateInSaoPaulo } from "@/lib/notify/calendar";
import { isClosedColumnLabel } from "@/lib/boards/plano-de-acao-template";
import type { DueCard } from "@/lib/ops/due";
import type { Prioridade } from "@/types/boards";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const HORIZON_DAYS = 7;

function hrefFor(isInternal: boolean, slug: string): string {
  return isInternal ? "/admin/atividades" : `/admin/clientes/${slug}`;
}

function asPrioridade(value: string | null): Prioridade {
  if (value === "alta" || value === "baixa") return value;
  return "media";
}

export async function listStaffDueCards(): Promise<
  Result<{ today: string; horizonDays: number; cards: DueCard[] }>
> {
  const supabase = await createClient();
  try {
    await requireCapability(supabase, "painel");
  } catch {
    try {
      await requireCapability(supabase, "atividades");
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Acesso negado",
      };
    }
  }

  const today = dateInSaoPaulo();
  const horizon = addDaysIso(today, HORIZON_DAYS);

  const rpc = await supabase.rpc("staff_due_cards", {
    p_horizon_days: HORIZON_DAYS,
  });

  if (!rpc.error && rpc.data) {
    const cards: DueCard[] = (rpc.data as Array<Record<string, unknown>>).map(
      (row) => {
        const isInternal = Boolean(row.is_internal);
        const slug = String(row.org_slug ?? "");
        return {
          id: String(row.card_id),
          titulo: String(row.titulo ?? ""),
          prazo: String(row.prazo ?? ""),
          prioridade: asPrioridade(String(row.prioridade ?? "media")),
          orgId: String(row.org_id),
          orgName: String(row.org_name ?? ""),
          orgSlug: slug,
          isInternal,
          boardName: String(row.board_name ?? ""),
          columnLabel: String(row.column_label ?? ""),
          responsavelNome:
            typeof row.responsavel_nome === "string"
              ? row.responsavel_nome
              : null,
          relatedOrgName:
            typeof row.related_org_name === "string"
              ? row.related_org_name
              : null,
          href: hrefFor(isInternal, slug),
        };
      },
    );
    return { success: true, data: { today, horizonDays: HORIZON_DAYS, cards } };
  }

  const fallback = await supabase
    .from("board_cards")
    .select(
      "id, titulo, prazo, prioridade, board_id, related_org_id, boards!inner(id, name, module, kind, org_id, organizations!inner(id, name, slug, is_internal)), board_columns!inner(label), profiles!board_cards_responsavel_id_fkey(full_name)",
    )
    .eq("boards.module", "atividades")
    .not("prazo", "is", null)
    .lte("prazo", horizon)
    .order("prazo", { ascending: true });

  if (fallback.error) {
    return {
      success: false,
      error: rpc.error?.message ?? fallback.error.message,
    };
  }

  type NestedOrg = {
    id: string;
    name: string;
    slug: string;
    is_internal: boolean;
  };
  type NestedBoard = {
    name: string;
    module: string;
    kind: string;
    organizations: NestedOrg | NestedOrg[];
  };
  type NestedCol = { label: string };
  type NestedProfile = { full_name: string | null };
  type Row = {
    id: string;
    titulo: string;
    prazo: string | null;
    prioridade: string;
    boards: NestedBoard | NestedBoard[];
    board_columns: NestedCol | NestedCol[];
    profiles: NestedProfile | NestedProfile[] | null;
  };

  const cards: DueCard[] = [];
  for (const raw of (fallback.data ?? []) as unknown as Row[]) {
    const board = Array.isArray(raw.boards) ? raw.boards[0] : raw.boards;
    const org = board
      ? Array.isArray(board.organizations)
        ? board.organizations[0]
        : board.organizations
      : undefined;
    const col = Array.isArray(raw.board_columns)
      ? raw.board_columns[0]
      : raw.board_columns;
    const profile = Array.isArray(raw.profiles)
      ? raw.profiles[0]
      : raw.profiles;
    if (!board || !org || !col || !raw.prazo) continue;
    if (board.kind === "admin_only") continue;
    if (isClosedColumnLabel(col.label)) continue;
    cards.push({
      id: raw.id,
      titulo: raw.titulo,
      prazo: raw.prazo,
      prioridade: asPrioridade(raw.prioridade),
      orgId: org.id,
      orgName: org.name,
      orgSlug: org.slug,
      isInternal: org.is_internal,
      boardName: board.name,
      columnLabel: col.label,
      responsavelNome: profile?.full_name ?? null,
      relatedOrgName: null,
      href: hrefFor(org.is_internal, org.slug),
    });
  }

  return { success: true, data: { today, horizonDays: HORIZON_DAYS, cards } };
}
