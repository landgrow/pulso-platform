-- =============================================================================
-- Migration 0022 — Autonomia: avisos, origem reunião→card, modelo Plano de Ação
-- =============================================================================

-- ─── Origem do card a partir do checklist da reunião ─────────────────────────

ALTER TABLE public.board_cards
  ADD COLUMN IF NOT EXISTS source_meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_checklist_item_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_board_cards_source_checklist_item
  ON public.board_cards (source_checklist_item_id)
  WHERE source_checklist_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_board_cards_source_meeting
  ON public.board_cards (source_meeting_id)
  WHERE source_meeting_id IS NOT NULL;

COMMENT ON COLUMN public.board_cards.source_checklist_item_id IS
  'UUID do item de checklist da reunião que gerou este card. Único para não duplicar.';

-- ─── Preferências lidas pelo cron (espelho do user_metadata) ─────────────────

CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id         uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  prazo           boolean NOT NULL DEFAULT true,
  reuniao         boolean NOT NULL DEFAULT true,
  convite_equipe  boolean NOT NULL DEFAULT true,
  resumo_diario   boolean NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_prefs IS
  'Preferências de e-mail consultadas pelo job horário. O usuário grava pela tela Configurações → Notificações.';

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_prefs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_prefs_select ON public.notification_prefs;
CREATE POLICY notification_prefs_select ON public.notification_prefs
  FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS notification_prefs_insert ON public.notification_prefs;
CREATE POLICY notification_prefs_insert ON public.notification_prefs
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notification_prefs_update ON public.notification_prefs;
CREATE POLICY notification_prefs_update ON public.notification_prefs
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('prazo', 'reuniao', 'resumo')),
  entity_key  text NOT NULL,
  day         date NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, entity_key, day)
);

COMMENT ON TABLE public.notification_deliveries IS
  'Idempotência do cron: um e-mail do mesmo tipo/entidade por dia e por pessoa.';

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries FORCE ROW LEVEL SECURITY;

-- Sem políticas de cliente: só service_role (cron) escreve/lê.

-- ─── Default board: colunas do Plano de Ação ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_or_create_default_board(p_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id uuid;
  v_admin_id uuid;
  v_is_internal boolean;
BEGIN
  IF NOT public.can_access_org(p_org_id) THEN
    RAISE EXCEPTION 'Acesso negado a esta organização';
  END IF;

  SELECT is_internal INTO v_is_internal
  FROM public.organizations WHERE id = p_org_id;

  SELECT id INTO v_board_id
  FROM public.boards
  WHERE org_id = p_org_id
    AND module = 'atividades'
    AND kind = 'standard'
  ORDER BY position, created_at
  LIMIT 1;

  IF v_board_id IS NULL THEN
    INSERT INTO public.boards (org_id, name, module, kind, created_by, field_config)
    VALUES (
      p_org_id,
      'Plano de Ação',
      'atividades',
      'standard',
      auth.uid(),
      '{"titulo":{"position":0,"visible":true},"status":{"position":1,"visible":true},"prioridade":{"position":2,"visible":true},"responsavel":{"position":3,"visible":true},"setor":{"position":4,"visible":true},"prazo":{"position":5,"visible":true},"cliente":{"position":6,"visible":true}}'::jsonb
    )
    RETURNING id INTO v_board_id;

    INSERT INTO public.board_columns (board_id, label, color, position) VALUES
      (v_board_id, 'A FAZER', '#94A3B8', 0),
      (v_board_id, 'EM ANDAMENTO', '#6366F1', 1),
      (v_board_id, 'REVISÃO INTERNA', '#EAB308', 2),
      (v_board_id, 'REVISÃO DO CLIENTE', '#F97316', 3),
      (v_board_id, 'Concluído', '#22C55E', 4),
      (v_board_id, 'CANCELADO', '#EF4444', 5),
      (v_board_id, 'Reuniões', '#8B5CF6', 6);

    INSERT INTO public.board_properties (board_id, key, label, type, options, position, visible)
    VALUES (v_board_id, 'urgencia', 'Urgência', 'select', '["Alta","Média","Baixa","Sem prioridade"]'::jsonb, 0, true);
  END IF;

  IF COALESCE(v_is_internal, false) THEN
    SELECT id INTO v_admin_id
    FROM public.boards
    WHERE org_id = p_org_id AND kind = 'admin_only' AND module = 'atividades'
    LIMIT 1;

    IF v_admin_id IS NULL THEN
      INSERT INTO public.boards (org_id, name, module, kind, icon, color, position)
      VALUES (
        p_org_id,
        'Tarefas administrativas',
        'atividades',
        'admin_only',
        '🔒',
        '#64748B',
        1000
      )
      RETURNING id INTO v_admin_id;

      INSERT INTO public.board_columns (board_id, label, color, position) VALUES
        (v_admin_id, 'A FAZER', '#94A3B8', 0),
        (v_admin_id, 'EM ANDAMENTO', '#6366F1', 1),
        (v_admin_id, 'REVISÃO INTERNA', '#EAB308', 2),
        (v_admin_id, 'Concluído', '#22C55E', 3);
    END IF;
  END IF;

  RETURN v_board_id;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_atividades_dashboard(uuid, text);

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
  IF p_module = 'crm' THEN
    IF NOT public.staff_can('crm') THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
  ELSE
    IF NOT public.staff_can('atividades') THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
  END IF;

  RETURN QUERY
  WITH cards AS (
    SELECT bc.*, bcol.label AS column_label
    FROM public.board_cards bc
    JOIN public.boards b ON b.id = bc.board_id
    JOIN public.board_columns bcol ON bcol.id = bc.column_id
    WHERE b.org_id = p_org_id
      AND b.module = p_module
      AND (b.kind <> 'admin_only' OR public.is_platform_admin())
  )
  SELECT
    (SELECT count(*) FROM cards)::bigint,
    (SELECT count(*) FROM cards WHERE column_label ILIKE '%conclu%')::bigint,
    (SELECT count(*) FROM cards
       WHERE prazo IS NOT NULL
         AND prazo < current_date
         AND column_label !~* 'conclu|cancel')::bigint,
    (SELECT COALESCE(jsonb_object_agg(setor, total), '{}'::jsonb)
       FROM (SELECT setor, count(*) AS total FROM cards WHERE setor IS NOT NULL GROUP BY setor) s),
    (SELECT COALESCE(jsonb_object_agg(COALESCE(p.full_name, 'Sem responsável'), total), '{}'::jsonb)
       FROM (
         SELECT responsavel_id, count(*) AS total
         FROM cards
         GROUP BY responsavel_id
       ) r
       LEFT JOIN public.profiles p ON p.id = r.responsavel_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_atividades_dashboard(uuid, text) TO authenticated;
