-- =============================================================================
-- Migration 0055 — Pontuação ao vivo do BIN: edição só na empresa que a pessoa acessa
-- =============================================================================
-- A política de UPDATE da 0051 checava só a função (staff_can 'bin'/'clientes'),
-- sem conferir se a pessoa tem acesso àquela empresa. Um consultor com a função
-- BIN podia alterar a pontuação de uma empresa que não é dele. Agora exige
-- can_access_org(org_id), igual ao SELECT e ao INSERT.
-- Idempotente; só roda se a tabela existir (a 0051 já aplicada).
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.bin_live_scores') IS NULL THEN
    RETURN;
  END IF;

  DROP POLICY IF EXISTS bin_live_update ON public.bin_live_scores;
  CREATE POLICY bin_live_update ON public.bin_live_scores
    FOR UPDATE
    USING (
      public.can_access_org(org_id)
      AND (public.staff_can('bin') OR public.staff_can('clientes'))
    )
    WITH CHECK (
      public.can_access_org(org_id)
      AND (public.staff_can('bin') OR public.staff_can('clientes'))
    );
END $$;
