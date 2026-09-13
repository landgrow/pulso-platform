-- =============================================================================
-- Migration 0019 — CRM vira kanban (mesma estrutura de Atividades)
-- =============================================================================
-- CRM deixa de usar as tabelas relacionais (crm_contas/crm_contatos/
-- crm_negociacoes — nenhuma tinha dado real ainda) e passa a usar exatamente a
-- mesma infraestrutura de boards de Atividades: vários kanbans (Leads,
-- Parceiros etc.), com propriedades personalizadas, colunas, filtros,
-- ordenação, agrupamento e cor — tudo já construído. `module` separa os
-- boards de Atividades dos boards de CRM dentro da mesma org interna.
-- =============================================================================

ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS module text NOT NULL DEFAULT 'atividades'
  CHECK (module IN ('atividades', 'crm'));

COMMENT ON COLUMN public.boards.module IS
  'Separa os kanbans de Atividades dos kanbans de CRM (ambos reaproveitam a mesma tabela/estrutura) — "atividades" ou "crm".';

CREATE INDEX IF NOT EXISTS idx_boards_org_module ON public.boards (org_id, module);

-- ─── Dashboard agregado passa a aceitar o módulo (Atividades ou CRM) ────────
-- p_module tem default 'atividades' pra manter compatibilidade com quem já
-- chama essa função sem o parâmetro novo.

DROP FUNCTION IF EXISTS public.admin_atividades_dashboard(uuid);

CREATE FUNCTION public.admin_atividades_dashboard(p_org_id uuid, p_module text DEFAULT 'atividades')
RETURNS TABLE (
  total_cards bigint,
  concluidos bigint,
  atrasados bigint,
  por_setor jsonb,
  por_responsavel jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas platform_admin';
  END IF;

  RETURN QUERY
  WITH cards AS (
    SELECT bc.*, bcol.label AS column_label
    FROM public.board_cards bc
    JOIN public.boards b ON b.id = bc.board_id
    JOIN public.board_columns bcol ON bcol.id = bc.column_id
    WHERE b.org_id = p_org_id AND b.module = p_module
  )
  SELECT
    (SELECT count(*) FROM cards)::bigint,
    (SELECT count(*) FROM cards WHERE column_label = 'Concluído')::bigint,
    (SELECT count(*) FROM cards WHERE prazo IS NOT NULL AND prazo < current_date AND column_label <> 'Concluído')::bigint,
    (SELECT COALESCE(jsonb_object_agg(setor, total), '{}'::jsonb)
       FROM (SELECT setor, count(*) AS total FROM cards WHERE setor IS NOT NULL GROUP BY setor) s),
    (SELECT COALESCE(jsonb_object_agg(COALESCE(p.full_name, 'Sem responsável'), total), '{}'::jsonb)
       FROM (SELECT responsavel_id, count(*) AS total FROM cards GROUP BY responsavel_id) c
       LEFT JOIN public.profiles p ON p.id = c.responsavel_id);
END;
$$;

COMMENT ON FUNCTION public.admin_atividades_dashboard(uuid, text) IS
  'Resumo agregado dos cards de um módulo de boards (atividades ou crm) da org (total, concluídos, atrasados, por setor, por responsável). Restrito a platform_admin.';

GRANT EXECUTE ON FUNCTION public.admin_atividades_dashboard(uuid, text) TO authenticated;
