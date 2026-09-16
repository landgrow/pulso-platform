-- =============================================================================
-- Migration 0023 — WorkSmart em Atividades (sem BIN)
-- =============================================================================
-- Cascata: objetivo de alto impacto (manual) → ficha SMART → key results →
-- menor ação 5H2W vira card no Plano de Ação. Ligação com o BIN fica para
-- quando o diagnóstico estiver estável — esta migration não cria FK nem
-- coluna de assessment.
-- =============================================================================

-- ─── Objetivo ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.worksmart_objectives (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title              text NOT NULL,
  setor              text,
  smart_especifica   text,
  smart_mensuravel   text,
  smart_atingivel    text,
  smart_relevante    text,
  smart_temporal     date,
  status             text NOT NULL DEFAULT 'rascunho'
                       CHECK (status IN ('rascunho', 'ativo', 'concluido')),
  created_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.worksmart_objectives IS
  'Objetivo de alto impacto da WorkSmart. Entra na mão (passo 01 sem BIN). SMART nos campos smart_*.';

CREATE INDEX IF NOT EXISTS idx_worksmart_objectives_org
  ON public.worksmart_objectives (org_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_worksmart_objectives_updated_at ON public.worksmart_objectives;
CREATE TRIGGER trg_worksmart_objectives_updated_at
  BEFORE UPDATE ON public.worksmart_objectives
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Key results (percurso) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.worksmart_key_results (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id   uuid NOT NULL REFERENCES public.worksmart_objectives(id) ON DELETE CASCADE,
  org_id         uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title          text NOT NULL,
  target_value   numeric,
  current_value  numeric NOT NULL DEFAULT 0,
  unit           text,
  position       integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.worksmart_key_results IS
  'Key results do objetivo WorkSmart — o percurso mensurável até a meta SMART.';

CREATE INDEX IF NOT EXISTS idx_worksmart_key_results_objective
  ON public.worksmart_key_results (objective_id, position);

-- ─── Ação 5H2W ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.worksmart_actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id   uuid NOT NULL REFERENCES public.worksmart_key_results(id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  o_que           text NOT NULL,
  quem_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  quando          date,
  onde            text,
  por_que         text,
  como            text,
  quanto          text,
  card_id         uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.worksmart_actions IS
  'Menor ação executável (5H2W). Gera um card no Plano de Ação da mesma org.';

CREATE INDEX IF NOT EXISTS idx_worksmart_actions_kr
  ON public.worksmart_actions (key_result_id, created_at);

-- ─── Origem do card ──────────────────────────────────────────────────────────

ALTER TABLE public.board_cards
  ADD COLUMN IF NOT EXISTS source_action_id uuid REFERENCES public.worksmart_actions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_board_cards_source_action
  ON public.board_cards (source_action_id)
  WHERE source_action_id IS NOT NULL;

COMMENT ON COLUMN public.board_cards.source_action_id IS
  'Ação 5H2W da WorkSmart que gerou este card. Único para não duplicar.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'worksmart_actions_card_id_fkey'
  ) THEN
    ALTER TABLE public.worksmart_actions
      ADD CONSTRAINT worksmart_actions_card_id_fkey
      FOREIGN KEY (card_id) REFERENCES public.board_cards(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── RLS (mesmo recorte de Reuniões: staff com capacidade atividades) ────────

ALTER TABLE public.worksmart_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksmart_objectives FORCE ROW LEVEL SECURITY;
ALTER TABLE public.worksmart_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksmart_key_results FORCE ROW LEVEL SECURITY;
ALTER TABLE public.worksmart_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksmart_actions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS worksmart_objectives_select ON public.worksmart_objectives;
DROP POLICY IF EXISTS worksmart_objectives_insert ON public.worksmart_objectives;
DROP POLICY IF EXISTS worksmart_objectives_update ON public.worksmart_objectives;
DROP POLICY IF EXISTS worksmart_objectives_delete ON public.worksmart_objectives;
CREATE POLICY worksmart_objectives_select ON public.worksmart_objectives
  FOR SELECT USING (public.staff_can('atividades'));
CREATE POLICY worksmart_objectives_insert ON public.worksmart_objectives
  FOR INSERT WITH CHECK (public.staff_can('atividades'));
CREATE POLICY worksmart_objectives_update ON public.worksmart_objectives
  FOR UPDATE USING (public.staff_can('atividades'))
  WITH CHECK (public.staff_can('atividades'));
CREATE POLICY worksmart_objectives_delete ON public.worksmart_objectives
  FOR DELETE USING (public.staff_can('atividades'));

DROP POLICY IF EXISTS worksmart_key_results_select ON public.worksmart_key_results;
DROP POLICY IF EXISTS worksmart_key_results_insert ON public.worksmart_key_results;
DROP POLICY IF EXISTS worksmart_key_results_update ON public.worksmart_key_results;
DROP POLICY IF EXISTS worksmart_key_results_delete ON public.worksmart_key_results;
CREATE POLICY worksmart_key_results_select ON public.worksmart_key_results
  FOR SELECT USING (public.staff_can('atividades'));
CREATE POLICY worksmart_key_results_insert ON public.worksmart_key_results
  FOR INSERT WITH CHECK (public.staff_can('atividades'));
CREATE POLICY worksmart_key_results_update ON public.worksmart_key_results
  FOR UPDATE USING (public.staff_can('atividades'))
  WITH CHECK (public.staff_can('atividades'));
CREATE POLICY worksmart_key_results_delete ON public.worksmart_key_results
  FOR DELETE USING (public.staff_can('atividades'));

DROP POLICY IF EXISTS worksmart_actions_select ON public.worksmart_actions;
DROP POLICY IF EXISTS worksmart_actions_insert ON public.worksmart_actions;
DROP POLICY IF EXISTS worksmart_actions_update ON public.worksmart_actions;
DROP POLICY IF EXISTS worksmart_actions_delete ON public.worksmart_actions;
CREATE POLICY worksmart_actions_select ON public.worksmart_actions
  FOR SELECT USING (public.staff_can('atividades'));
CREATE POLICY worksmart_actions_insert ON public.worksmart_actions
  FOR INSERT WITH CHECK (public.staff_can('atividades'));
CREATE POLICY worksmart_actions_update ON public.worksmart_actions
  FOR UPDATE USING (public.staff_can('atividades'))
  WITH CHECK (public.staff_can('atividades'));
CREATE POLICY worksmart_actions_delete ON public.worksmart_actions
  FOR DELETE USING (public.staff_can('atividades'));
