-- =============================================================================
-- Migration 0015 — Submenu completo de Atividades (Reuniões, Rituais, Automações)
-- =============================================================================
-- Replica o submenu do protótipo (kanban.html, SECONDARY_PANELS['gestor-tarefas'])
-- dentro do módulo Atividades: Dashboard e Importar Dados usam dados que já
-- existem (board_cards); Reuniões, Rituais e Automações precisam de tabela
-- própria. "Permissões" não ganha tabela nova — aponta pra Equipe, que já
-- cobre platform_roles. Tudo restrito a platform_admin, mesmo padrão de
-- crm_leads (0012) — é operação interna da Land Grow, não dado de cliente.
-- =============================================================================

-- ─── Reuniões internas ───────────────────────────────────────────────────────
-- Mesmo formato do banco "📅 Reuniões" do Notion (ver CLAUDE.md raiz): resumo +
-- tópicos abordados + checklist de atividades.

CREATE TABLE IF NOT EXISTS public.meetings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  titulo         text NOT NULL,
  data           date NOT NULL DEFAULT current_date,
  participantes  text[] NOT NULL DEFAULT '{}',
  resumo         text,
  topicos        text,
  checklist      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.meetings IS
  'Registro de reuniões internas da Land Grow — resumo, tópicos e checklist de atividades, mesmo formato do banco de Reuniões do Notion.';

-- ─── Rituais de gestão ───────────────────────────────────────────────────────
-- Um único tipo de registro pros 3 rituais do protótipo (Daily Standup,
-- Weekly Review, Sessão de Resultado) — diferenciados pelo campo `tipo`.

CREATE TABLE IF NOT EXISTS public.rituals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tipo           text NOT NULL CHECK (tipo IN ('standup', 'weekly', 'resultado')),
  data           date NOT NULL DEFAULT current_date,
  participantes  text[] NOT NULL DEFAULT '{}',
  notas          text,
  created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rituals IS
  'Registro recorrente dos rituais de gestão (Daily Standup / Weekly Review / Sessão de Resultado) do Plano de Ação interno.';

-- ─── Automações de kanban ────────────────────────────────────────────────────
-- Regra simples e real (não é motor genérico): quando um card entra nesta
-- coluna, define prioridade e/ou responsável automaticamente. Avaliada em
-- moveCard/createCard nas server actions — não é um cron nem um webhook.

CREATE TABLE IF NOT EXISTS public.board_automations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id            uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  column_id           uuid NOT NULL REFERENCES public.board_columns(id) ON DELETE CASCADE,
  set_prioridade      text CHECK (set_prioridade IN ('alta', 'media', 'baixa')),
  set_responsavel_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ativo               boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.board_automations IS
  'Regra "quando card entra na coluna X, define prioridade/responsável Y" — avaliada de forma síncrona ao mover ou criar um card.';

-- ─── Índices ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_meetings_org_id ON public.meetings (org_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_rituals_org_tipo ON public.rituals (org_id, tipo, data DESC);
CREATE INDEX IF NOT EXISTS idx_board_automations_column_id ON public.board_automations (column_id) WHERE ativo;

-- ─── Trigger updated_at ──────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_meetings_updated_at ON public.meetings;
CREATE TRIGGER trg_meetings_updated_at BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.meetings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rituals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rituals            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.board_automations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_automations  FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meetings_select ON public.meetings;
DROP POLICY IF EXISTS meetings_insert ON public.meetings;
DROP POLICY IF EXISTS meetings_update ON public.meetings;
DROP POLICY IF EXISTS meetings_delete ON public.meetings;

CREATE POLICY meetings_select ON public.meetings FOR SELECT USING (public.is_platform_admin());
CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY meetings_delete ON public.meetings FOR DELETE USING (public.is_platform_admin());

DROP POLICY IF EXISTS rituals_select ON public.rituals;
DROP POLICY IF EXISTS rituals_insert ON public.rituals;
DROP POLICY IF EXISTS rituals_update ON public.rituals;
DROP POLICY IF EXISTS rituals_delete ON public.rituals;

CREATE POLICY rituals_select ON public.rituals FOR SELECT USING (public.is_platform_admin());
CREATE POLICY rituals_insert ON public.rituals FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY rituals_update ON public.rituals FOR UPDATE USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY rituals_delete ON public.rituals FOR DELETE USING (public.is_platform_admin());

DROP POLICY IF EXISTS board_automations_select ON public.board_automations;
DROP POLICY IF EXISTS board_automations_insert ON public.board_automations;
DROP POLICY IF EXISTS board_automations_update ON public.board_automations;
DROP POLICY IF EXISTS board_automations_delete ON public.board_automations;

CREATE POLICY board_automations_select ON public.board_automations FOR SELECT USING (public.is_platform_admin());
CREATE POLICY board_automations_insert ON public.board_automations FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY board_automations_update ON public.board_automations FOR UPDATE USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY board_automations_delete ON public.board_automations FOR DELETE USING (public.is_platform_admin());

-- ─── Dashboard interno: resumo agregado de todos os boards da org ───────────

CREATE OR REPLACE FUNCTION public.admin_atividades_dashboard(p_org_id uuid)
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
    WHERE b.org_id = p_org_id
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

COMMENT ON FUNCTION public.admin_atividades_dashboard(uuid) IS
  'Resumo agregado de todos os cards de Atividades da org (total, concluídos, atrasados, por setor, por responsável). Restrito a platform_admin.';

GRANT EXECUTE ON FUNCTION public.admin_atividades_dashboard(uuid) TO authenticated;
