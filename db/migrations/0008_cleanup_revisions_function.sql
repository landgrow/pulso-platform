-- =============================================================================
-- Migration 0008 — Limpeza de revisions antigas
-- =============================================================================
-- Story 1.6, AC-5. Função manual/administrativa que apaga revisions mais
-- antigas de uma coleção, mantendo só as `keep_last_n` mais recentes.
--
-- Não agendamos via pg_cron nesta migration: a extensão pg_cron depende do
-- plano/config do projeto Supabase (nem todo projeto tem habilitada) e não
-- há como verificar isso a partir do repositório. A própria AC-5 já prevê
-- execução manual como alternativa ("ou manual via admin"). Rodar via:
--   SELECT public.cleanup_old_revisions('<colecao_id>'::uuid);
-- ou, para todas as coleções de uma vez:
--   SELECT public.cleanup_all_old_revisions();
-- Se/quando pg_cron estiver disponível no projeto, agendar com:
--   SELECT cron.schedule('cleanup-colecao-revisions', '0 3 1 * *',
--     $$SELECT public.cleanup_all_old_revisions()$$);
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_revisions(
  p_colecao_id uuid,
  p_keep_last_n int DEFAULT 50
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  IF p_keep_last_n < 1 THEN
    RAISE EXCEPTION 'keep_last_n deve ser >= 1';
  END IF;

  WITH to_delete AS (
    SELECT id
    FROM public.colecao_revisions
    WHERE colecao_id = p_colecao_id
    ORDER BY rev_number DESC
    OFFSET p_keep_last_n
  )
  DELETE FROM public.colecao_revisions
  WHERE id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_revisions(uuid, int) IS
  'Apaga revisions antigas de uma coleção, mantendo as p_keep_last_n mais recentes. Retorna quantas linhas foram apagadas.';

CREATE OR REPLACE FUNCTION public.cleanup_all_old_revisions(
  p_keep_last_n int DEFAULT 50
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colecao_id uuid;
  v_total int := 0;
BEGIN
  FOR v_colecao_id IN
    SELECT DISTINCT colecao_id FROM public.colecao_revisions
  LOOP
    v_total := v_total + public.cleanup_old_revisions(v_colecao_id, p_keep_last_n);
  END LOOP;

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.cleanup_all_old_revisions(int) IS
  'Roda cleanup_old_revisions() para todas as coleções que têm revisions. Pensada para execução mensal manual ou via pg_cron.';
