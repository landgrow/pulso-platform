-- =============================================================================
-- Migration 0021 — Funções por consultor + kanban fixo de tarefas admin
-- =============================================================================
-- Consultor deixa de ser "só clientes atribuídos". Cada um ganha um conjunto
-- de funções admin (marcadas em /admin/equipe). O kanban
-- "Tarefas administrativas" da org interna é kind=admin_only: o consultor
-- nunca vê o quadro nem os cards, mesmo com a função Atividades ligada.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.consultant_capabilities (

  consultant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capability    text NOT NULL
                  CHECK (capability IN (
                    'painel', 'atividades', 'mapa_mental', 'crm', 'clientes',
                    'bin', 'min', 'metricas', 'acessos', 'equipe', 'audit_log'
                  )),
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consultant_id, capability)
);

COMMENT ON TABLE public.consultant_capabilities IS
  'Funções admin liberadas para cada consultor. platform_admin ignora esta tabela (tem tudo).';

ALTER TABLE public.consultant_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_capabilities FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.staff_can(p_capability text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_admin() THEN
    RETURN true;
  END IF;
  IF NOT public.is_consultant() THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.consultant_capabilities cc
    WHERE cc.consultant_id = auth.uid()
      AND cc.capability = p_capability
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_can(text) TO authenticated;

DROP POLICY IF EXISTS consultant_caps_select ON public.consultant_capabilities;
DROP POLICY IF EXISTS consultant_caps_admin ON public.consultant_capabilities;

CREATE POLICY consultant_caps_select ON public.consultant_capabilities
  FOR SELECT
  USING (
    consultant_id = auth.uid()
    OR public.is_platform_admin()
  );

CREATE POLICY consultant_caps_admin ON public.consultant_capabilities
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ─── Org interna: consultor com função operacional entra nela ───────────────

CREATE OR REPLACE FUNCTION public.can_access_org(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_platform_admin() THEN
    RETURN true;
  END IF;

  IF public.is_consultant() THEN
    IF EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = $1 AND o.is_internal
    ) THEN
      RETURN public.staff_can('atividades')
          OR public.staff_can('crm')
          OR public.staff_can('painel')
          OR public.staff_can('mapa_mental');
    END IF;

    RETURN EXISTS (
      SELECT 1 FROM public.consultant_assignments
      WHERE consultant_id = auth.uid() AND org_id = $1
    );
  END IF;

  RETURN public.is_member_of($1);
END;
$$;

-- ─── Kanban fixo de tarefas administrativas ─────────────────────────────────

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'standard';

ALTER TABLE public.boards DROP CONSTRAINT IF EXISTS boards_kind_check;
ALTER TABLE public.boards
  ADD CONSTRAINT boards_kind_check CHECK (kind IN ('standard', 'admin_only'));

COMMENT ON COLUMN public.boards.kind IS
  'standard = visível para quem tem Atividades; admin_only = só platform_admin (tarefas administrativas).';

CREATE OR REPLACE FUNCTION public.can_access_board(p_board_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.boards b
    WHERE b.id = p_board_id
      AND public.can_access_org(b.org_id)
      AND (b.kind <> 'admin_only' OR public.is_platform_admin())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_board(uuid) TO authenticated;

DROP POLICY IF EXISTS boards_select ON public.boards;
DROP POLICY IF EXISTS boards_insert ON public.boards;
DROP POLICY IF EXISTS boards_update ON public.boards;
DROP POLICY IF EXISTS boards_delete ON public.boards;

CREATE POLICY boards_select ON public.boards
  FOR SELECT USING (public.can_access_board(id));
CREATE POLICY boards_insert ON public.boards
  FOR INSERT WITH CHECK (
    public.can_access_org(org_id) AND kind = 'standard'
  );
CREATE POLICY boards_update ON public.boards
  FOR UPDATE USING (public.can_access_board(id))
  WITH CHECK (public.can_access_board(id));
CREATE POLICY boards_delete ON public.boards
  FOR DELETE USING (
    public.is_platform_admin() AND kind <> 'admin_only'
  );

DROP POLICY IF EXISTS board_columns_select ON public.board_columns;
DROP POLICY IF EXISTS board_columns_insert ON public.board_columns;
DROP POLICY IF EXISTS board_columns_update ON public.board_columns;
DROP POLICY IF EXISTS board_columns_delete ON public.board_columns;

CREATE POLICY board_columns_select ON public.board_columns
  FOR SELECT USING (public.can_access_board(board_id));
CREATE POLICY board_columns_insert ON public.board_columns
  FOR INSERT WITH CHECK (public.can_access_board(board_id));
CREATE POLICY board_columns_update ON public.board_columns
  FOR UPDATE USING (public.can_access_board(board_id))
  WITH CHECK (public.can_access_board(board_id));
CREATE POLICY board_columns_delete ON public.board_columns
  FOR DELETE USING (public.can_access_board(board_id) AND public.is_platform_admin());

DROP POLICY IF EXISTS board_cards_select ON public.board_cards;
DROP POLICY IF EXISTS board_cards_insert ON public.board_cards;
DROP POLICY IF EXISTS board_cards_update ON public.board_cards;
DROP POLICY IF EXISTS board_cards_delete ON public.board_cards;

CREATE POLICY board_cards_select ON public.board_cards
  FOR SELECT USING (public.can_access_board(board_id));
CREATE POLICY board_cards_insert ON public.board_cards
  FOR INSERT WITH CHECK (public.can_access_board(board_id));
CREATE POLICY board_cards_update ON public.board_cards
  FOR UPDATE USING (public.can_access_board(board_id))
  WITH CHECK (public.can_access_board(board_id));
CREATE POLICY board_cards_delete ON public.board_cards
  FOR DELETE USING (public.can_access_board(board_id));

-- Garante o kanban padrão (standard) e, na org interna, o kanban admin_only.
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
    INSERT INTO public.boards (org_id, name, module, kind, created_by)
    VALUES (p_org_id, 'Plano de Ação', 'atividades', 'standard', auth.uid())
    RETURNING id INTO v_board_id;

    INSERT INTO public.board_columns (board_id, label, color, position) VALUES
      (v_board_id, 'A Fazer', '#94A3B8', 0),
      (v_board_id, 'Em Andamento', '#3B82F6', 1),
      (v_board_id, 'Revisão', '#EAB308', 2),
      (v_board_id, 'Concluído', '#22C55E', 3);
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
        (v_admin_id, 'A Fazer', '#94A3B8', 0),
        (v_admin_id, 'Em Andamento', '#3B82F6', 1),
        (v_admin_id, 'Revisão', '#EAB308', 2),
        (v_admin_id, 'Concluído', '#22C55E', 3);
    END IF;
  END IF;

  RETURN v_board_id;
END;
$$;

-- Dashboard ignora cards do kanban admin_only para quem não é admin.
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
    (SELECT count(*) FROM cards WHERE column_label = 'Concluído')::bigint,
    (SELECT count(*) FROM cards WHERE prazo IS NOT NULL AND prazo < current_date AND column_label <> 'Concluído')::bigint,
    (SELECT COALESCE(jsonb_object_agg(setor, total), '{}'::jsonb)
       FROM (SELECT setor, count(*) AS total FROM cards WHERE setor IS NOT NULL GROUP BY setor) s),
    (SELECT COALESCE(jsonb_object_agg(COALESCE(p.full_name, 'Sem responsável'), total), '{}'::jsonb)
       FROM (SELECT responsavel_id, count(*) AS total FROM cards GROUP BY responsavel_id) c
       LEFT JOIN public.profiles p ON p.id = c.responsavel_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_atividades_dashboard(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_crm_summary()
RETURNS TABLE (estagio text, total bigint, valor_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.staff_can('crm') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT l.estagio, count(*)::bigint, COALESCE(sum(l.valor_estimado), 0)
  FROM public.crm_leads l
  GROUP BY l.estagio;
END;
$$;

-- ─── Políticas de módulos admin: staff_can em vez de só platform_admin ──────

DROP POLICY IF EXISTS meetings_select ON public.meetings;
DROP POLICY IF EXISTS meetings_insert ON public.meetings;
DROP POLICY IF EXISTS meetings_update ON public.meetings;
DROP POLICY IF EXISTS meetings_delete ON public.meetings;
CREATE POLICY meetings_select ON public.meetings FOR SELECT USING (public.staff_can('atividades'));
CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK (public.staff_can('atividades'));
CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING (public.staff_can('atividades')) WITH CHECK (public.staff_can('atividades'));
CREATE POLICY meetings_delete ON public.meetings FOR DELETE USING (public.staff_can('atividades'));

DROP POLICY IF EXISTS rituals_select ON public.rituals;
DROP POLICY IF EXISTS rituals_insert ON public.rituals;
DROP POLICY IF EXISTS rituals_update ON public.rituals;
DROP POLICY IF EXISTS rituals_delete ON public.rituals;
CREATE POLICY rituals_select ON public.rituals FOR SELECT USING (public.staff_can('atividades'));
CREATE POLICY rituals_insert ON public.rituals FOR INSERT WITH CHECK (public.staff_can('atividades'));
CREATE POLICY rituals_update ON public.rituals FOR UPDATE USING (public.staff_can('atividades')) WITH CHECK (public.staff_can('atividades'));
CREATE POLICY rituals_delete ON public.rituals FOR DELETE USING (public.staff_can('atividades'));

DROP POLICY IF EXISTS board_automations_select ON public.board_automations;
DROP POLICY IF EXISTS board_automations_insert ON public.board_automations;
DROP POLICY IF EXISTS board_automations_update ON public.board_automations;
DROP POLICY IF EXISTS board_automations_delete ON public.board_automations;
CREATE POLICY board_automations_select ON public.board_automations FOR SELECT USING (public.staff_can('atividades'));
CREATE POLICY board_automations_insert ON public.board_automations FOR INSERT WITH CHECK (public.staff_can('atividades'));
CREATE POLICY board_automations_update ON public.board_automations FOR UPDATE USING (public.staff_can('atividades')) WITH CHECK (public.staff_can('atividades'));
CREATE POLICY board_automations_delete ON public.board_automations FOR DELETE USING (public.staff_can('atividades'));

DROP POLICY IF EXISTS crm_leads_select ON public.crm_leads;
DROP POLICY IF EXISTS crm_leads_insert ON public.crm_leads;
DROP POLICY IF EXISTS crm_leads_update ON public.crm_leads;
DROP POLICY IF EXISTS crm_leads_delete ON public.crm_leads;
CREATE POLICY crm_leads_select ON public.crm_leads FOR SELECT USING (public.staff_can('crm'));
CREATE POLICY crm_leads_insert ON public.crm_leads FOR INSERT WITH CHECK (public.staff_can('crm'));
CREATE POLICY crm_leads_update ON public.crm_leads FOR UPDATE USING (public.staff_can('crm')) WITH CHECK (public.staff_can('crm'));
CREATE POLICY crm_leads_delete ON public.crm_leads FOR DELETE USING (public.staff_can('crm'));

-- Tabelas antigas do CRM relacional (0013) — neste banco podem não existir
-- (o CRM virou kanban na 0019). DROP POLICY em relação inexistente falha.
DO $$
BEGIN
  IF to_regclass('public.crm_contas') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS crm_contas_select ON public.crm_contas';
    EXECUTE 'DROP POLICY IF EXISTS crm_contas_insert ON public.crm_contas';
    EXECUTE 'DROP POLICY IF EXISTS crm_contas_update ON public.crm_contas';
    EXECUTE 'DROP POLICY IF EXISTS crm_contas_delete ON public.crm_contas';
    EXECUTE $p$CREATE POLICY crm_contas_select ON public.crm_contas FOR SELECT USING (public.staff_can('crm'))$p$;
    EXECUTE $p$CREATE POLICY crm_contas_insert ON public.crm_contas FOR INSERT WITH CHECK (public.staff_can('crm'))$p$;
    EXECUTE $p$CREATE POLICY crm_contas_update ON public.crm_contas FOR UPDATE USING (public.staff_can('crm')) WITH CHECK (public.staff_can('crm'))$p$;
    EXECUTE $p$CREATE POLICY crm_contas_delete ON public.crm_contas FOR DELETE USING (public.staff_can('crm'))$p$;
  END IF;
  IF to_regclass('public.crm_contatos') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS crm_contatos_select ON public.crm_contatos';
    EXECUTE 'DROP POLICY IF EXISTS crm_contatos_insert ON public.crm_contatos';
    EXECUTE 'DROP POLICY IF EXISTS crm_contatos_update ON public.crm_contatos';
    EXECUTE 'DROP POLICY IF EXISTS crm_contatos_delete ON public.crm_contatos';
    EXECUTE $p$CREATE POLICY crm_contatos_select ON public.crm_contatos FOR SELECT USING (public.staff_can('crm'))$p$;
    EXECUTE $p$CREATE POLICY crm_contatos_insert ON public.crm_contatos FOR INSERT WITH CHECK (public.staff_can('crm'))$p$;
    EXECUTE $p$CREATE POLICY crm_contatos_update ON public.crm_contatos FOR UPDATE USING (public.staff_can('crm')) WITH CHECK (public.staff_can('crm'))$p$;
    EXECUTE $p$CREATE POLICY crm_contatos_delete ON public.crm_contatos FOR DELETE USING (public.staff_can('crm'))$p$;
  END IF;
  IF to_regclass('public.crm_negociacoes') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS crm_negociacoes_select ON public.crm_negociacoes';
    EXECUTE 'DROP POLICY IF EXISTS crm_negociacoes_insert ON public.crm_negociacoes';
    EXECUTE 'DROP POLICY IF EXISTS crm_negociacoes_update ON public.crm_negociacoes';
    EXECUTE 'DROP POLICY IF EXISTS crm_negociacoes_delete ON public.crm_negociacoes';
    EXECUTE $p$CREATE POLICY crm_negociacoes_select ON public.crm_negociacoes FOR SELECT USING (public.staff_can('crm'))$p$;
    EXECUTE $p$CREATE POLICY crm_negociacoes_insert ON public.crm_negociacoes FOR INSERT WITH CHECK (public.staff_can('crm'))$p$;
    EXECUTE $p$CREATE POLICY crm_negociacoes_update ON public.crm_negociacoes FOR UPDATE USING (public.staff_can('crm')) WITH CHECK (public.staff_can('crm'))$p$;
    EXECUTE $p$CREATE POLICY crm_negociacoes_delete ON public.crm_negociacoes FOR DELETE USING (public.staff_can('crm'))$p$;
  END IF;
END $$;

-- ─── Seed: funções padrão nos consultores já cadastrados + kanban admin ─────

INSERT INTO public.consultant_capabilities (consultant_id, capability)
SELECT pr.user_id, cap
FROM public.platform_roles pr
CROSS JOIN (
  VALUES
    ('painel'),
    ('atividades'),
    ('mapa_mental'),
    ('crm'),
    ('clientes'),
    ('bin'),
    ('min')
) AS caps(cap)
WHERE pr.role = 'consultant'
ON CONFLICT DO NOTHING;

-- Cria o kanban admin se a org interna já existir (senão, get_or_create faz).
INSERT INTO public.boards (org_id, name, module, kind, icon, color, position)
SELECT o.id, 'Tarefas administrativas', 'atividades', 'admin_only', '🔒', '#64748B', 1000
FROM public.organizations o
WHERE o.is_internal
  AND NOT EXISTS (
    SELECT 1 FROM public.boards b
    WHERE b.org_id = o.id AND b.kind = 'admin_only' AND b.module = 'atividades'
  );

INSERT INTO public.board_columns (board_id, label, color, position)
SELECT b.id, c.label, c.color, c.position
FROM public.boards b
CROSS JOIN (VALUES
  ('A Fazer', '#94A3B8', 0),
  ('Em Andamento', '#3B82F6', 1),
  ('Revisão', '#EAB308', 2),
  ('Concluído', '#22C55E', 3)
) AS c(label, color, position)
WHERE b.kind = 'admin_only'
  AND NOT EXISTS (
    SELECT 1 FROM public.board_columns col WHERE col.board_id = b.id
  );

CREATE OR REPLACE FUNCTION public.admin_team_directory()
RETURNS TABLE (
  user_id       uuid,
  email         text,
  full_name     text,
  role          text,
  assigned_orgs jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.staff_can('equipe') THEN
    RAISE EXCEPTION 'Acesso negado: apenas quem gerencia a equipe';
  END IF;

  RETURN QUERY
  SELECT
    pr.user_id, u.email::text, p.full_name, pr.role,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('org_id', o.id, 'org_name', o.name) ORDER BY o.name)
      FROM public.consultant_assignments ca
      JOIN public.organizations o ON o.id = ca.org_id
      WHERE ca.consultant_id = pr.user_id
    ), '[]'::jsonb)
  FROM public.platform_roles pr
  JOIN auth.users u ON u.id = pr.user_id
  LEFT JOIN public.profiles p ON p.id = pr.user_id
  ORDER BY pr.role, u.email;
END;
$$;
