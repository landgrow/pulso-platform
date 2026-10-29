-- =============================================================================
-- Migration 0051 — Diagnóstico BIN vivo
-- =============================================================================
-- Score do questionário continua sendo calculado no app. Esta tabela guarda
-- só o que veio DEPOIS: reunião, ajuste da equipe. O PDF/resposta original
-- não é reescrito.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bin_live_scores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  section_id  text NOT NULL,
  score       integer NOT NULL CHECK (score >= 0 AND score <= 100),
  source      text NOT NULL CHECK (source IN ('instrument', 'meeting', 'staff', 'chat')),
  source_id   uuid,
  reason      text NOT NULL,
  status      text NOT NULL DEFAULT 'applied'
                CHECK (status IN ('proposed', 'applied', 'rejected')),
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bin_live_scores IS
  'Atualizações do RADAR depois do questionário. A resposta original fica na coleção.';

CREATE INDEX IF NOT EXISTS idx_bin_live_scores_org
  ON public.bin_live_scores (org_id, section_id, created_at DESC);

ALTER TABLE public.bin_live_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bin_live_scores FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bin_live_select ON public.bin_live_scores;
DROP POLICY IF EXISTS bin_live_insert ON public.bin_live_scores;
DROP POLICY IF EXISTS bin_live_update ON public.bin_live_scores;

CREATE POLICY bin_live_select ON public.bin_live_scores
  FOR SELECT
  USING (
    public.can_access_org(org_id)
    AND (
      public.staff_can('bin')
      OR public.staff_can('clientes')
      OR public.staff_can('painel')
      OR (public.is_member_of(org_id) AND status = 'applied')
    )
  );

CREATE POLICY bin_live_insert ON public.bin_live_scores
  FOR INSERT
  WITH CHECK (
    public.can_access_org(org_id)
    AND (
      public.staff_can('bin')
      OR public.staff_can('clientes')
    )
  );

CREATE POLICY bin_live_update ON public.bin_live_scores
  FOR UPDATE
  USING (
    public.staff_can('bin') OR public.staff_can('clientes')
  )
  WITH CHECK (
    public.staff_can('bin') OR public.staff_can('clientes')
  );
