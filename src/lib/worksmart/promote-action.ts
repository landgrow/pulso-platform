import type { SupabaseClient } from "@supabase/supabase-js";
import { findTodoColumnId } from "@/lib/boards/plano-de-acao-template";
import { format5h2wNotes, type FiveH2W } from "@/lib/worksmart/cascade";

export async function promoteWorksmartAction(
  supabase: SupabaseClient,
  input: {
    actionId: string;
    orgId: string;
    fields: FiveH2W;
    quemId: string | null;
    quando: string | null;
    setor: string | null;
    createdBy: string | null;
  },
): Promise<{ cardId: string; boardId: string } | { error: string }> {
  const { data: existing } = await supabase
    .from("board_cards")
    .select("id, board_id")
    .eq("source_action_id", input.actionId)
    .maybeSingle();
  if (existing?.id && existing.board_id) {
    return { cardId: existing.id, boardId: existing.board_id };
  }

  const { data: boardId, error: rpcError } = await supabase.rpc(
    "get_or_create_default_board",
    { p_org_id: input.orgId },
  );
  if (rpcError || typeof boardId !== "string") {
    return {
      error:
        rpcError?.message ??
        "Não foi possível abrir o Plano de Ação desta organização.",
    };
  }

  const { data: columns } = await supabase
    .from("board_columns")
    .select("id, label")
    .eq("board_id", boardId)
    .order("position", { ascending: true });
  const todoId = findTodoColumnId(columns ?? []);
  if (!todoId) {
    return { error: "O Plano de Ação não tem coluna para novos cards." };
  }

  const { count } = await supabase
    .from("board_cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", todoId);

  const { data: card, error: cardError } = await supabase
    .from("board_cards")
    .insert({
      board_id: boardId,
      column_id: todoId,
      titulo: input.fields.oQue.trim(),
      position: count ?? 0,
      created_by: input.createdBy,
      source_action_id: input.actionId,
      responsavel_id: input.quemId,
      prazo: input.quando,
      setor: input.setor,
      observacoes: format5h2wNotes(input.fields),
    })
    .select("id")
    .single();

  if (cardError || !card) {
    return { error: cardError?.message ?? "Erro ao criar o card 5H2W." };
  }

  await supabase
    .from("worksmart_actions")
    .update({ card_id: card.id })
    .eq("id", input.actionId);

  return { cardId: card.id, boardId };
}
