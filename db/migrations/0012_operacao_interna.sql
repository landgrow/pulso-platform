-- =============================================================================
-- Migration 0012 — Operação interna da Land Grow (CRM + Kanban + Mapa Mental)
-- =============================================================================
-- A Land Grow ganha sua própria linha em organizations (is_internal = true) e
-- reaproveita 100% da RLS que já existe (can_access_org já retorna true pra
-- qualquer platform_admin, sem política nova). As mesmas tabelas de board
-- servem tanto pro board interno da Land Grow quanto pro board de cada
-- cliente — não existe schema paralelo pra "operação interna" vs "cliente".
-- =============================================================================

-- ─── Land Grow como organização interna ─────────────────────────────────────

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_one_internal
  ON public.organizations (is_internal) WHERE is_internal = true;

INSERT INTO public.organizations (slug, name, is_internal, plan)
VALUES ('land-grow', 'Land Grow', true, 'enterprise')
ON CONFLICT (slug) DO NOTHING;

-- ─── Kanban: boards -> columns -> cards ─────────────────────────────────────
-- Mesmo shape do protótipo (public/preview/kanban.html): board tem colunas e
-- cards; card tem prioridade/responsável/prazo/setor/sub-tarefas/comentários.

CREATE TABLE IF NOT EXISTS public.boards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  position    int NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.boards IS
  'Quadros kanban — um por organização (cliente ou a org interna Land Grow), pode ter mais de um.';

CREATE TABLE IF NOT EXISTS public.board_columns (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id  uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  label     text NOT NULL,
  color     text NOT NULL DEFAULT '#94A3B8',
  position  int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.board_cards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id        uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  column_id       uuid NOT NULL REFERENCES public.board_columns(id) ON DELETE CASCADE,
  titulo          text NOT NULL,
  prioridade      text NOT NULL DEFAULT 'media'
                    CHECK (prioridade IN ('alta', 'media', 'baixa')),
  responsavel_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  setor           text,
  prazo           date,
  -- Liga o card a um cliente de verdade (ex: card interno "Validar BIN RADAR
  -- — JS Construtora" aponta pra organization da JS Construtora) — é o que
  -- faz "o banco se conversar" entre o board interno e os clientes.
  related_org_id  uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  observacoes     text,
  subtarefas      jsonb NOT NULL DEFAULT '[]'::jsonb,
  comentarios     jsonb NOT NULL DEFAULT '[]'::jsonb,
  bloqueada_por   uuid REFERENCES public.board_cards(id) ON DELETE SET NULL,
  position        int NOT NULL DEFAULT 0,
  created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Mapa Mental: uma árvore jsonb por mapa ─────────────────────────────────
-- Mesmo shape do mm.tree do protótipo: {id, text, color, children:[...]}.

CREATE TABLE IF NOT EXISTS public.mind_maps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  tree        jsonb NOT NULL,
  layout      text NOT NULL DEFAULT 'radial',
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── CRM: funil de prospects ─────────────────────────────────────────────────
-- Sempre pertence à org interna Land Grow — antes de virar cliente, um lead
-- não tem organization própria. converted_org_id fecha o ciclo quando vira.

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  empresa             text NOT NULL,
  contato_nome        text,
  contato_email       text,
  contato_telefone    text,
  estagio             text NOT NULL DEFAULT 'novo'
                        CHECK (estagio IN ('novo', 'qualificando', 'proposta', 'negociacao', 'ganho', 'perdido')),
  servico_interesse   text CHECK (servico_interesse IN ('bin', 'scale', 'conselho', 'foco')),
  origem              text,
  valor_estimado      numeric(12,2),
  proxima_acao        text,
  proxima_acao_data   date,
  responsavel_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  observacoes         text,
  converted_org_id    uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_boards_org_id ON public.boards (org_id);
CREATE INDEX IF NOT EXISTS idx_board_columns_board_id ON public.board_columns (board_id, position);
CREATE INDEX IF NOT EXISTS idx_board_cards_board_id ON public.board_cards (board_id);
CREATE INDEX IF NOT EXISTS idx_board_cards_column_id ON public.board_cards (column_id, position);
CREATE INDEX IF NOT EXISTS idx_board_cards_related_org_id ON public.board_cards (related_org_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_org_id ON public.mind_maps (org_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_org_id ON public.crm_leads (org_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_estagio ON public.crm_leads (estagio);

-- ─── Triggers updated_at ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_boards_updated_at ON public.boards;
DROP TRIGGER IF EXISTS trg_board_cards_updated_at ON public.board_cards;
DROP TRIGGER IF EXISTS trg_mind_maps_updated_at ON public.mind_maps;
DROP TRIGGER IF EXISTS trg_crm_leads_updated_at ON public.crm_leads;

CREATE TRIGGER trg_boards_updated_at BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_board_cards_updated_at BEFORE UPDATE ON public.board_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mind_maps_updated_at BEFORE UPDATE ON public.mind_maps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_crm_leads_updated_at BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS: habilitar em todas ─────────────────────────────────────────────────

ALTER TABLE public.boards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_columns FORCE ROW LEVEL SECURITY;
ALTER TABLE public.board_cards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_cards   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mind_maps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_maps     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads     FORCE ROW LEVEL SECURITY;

-- ─── RLS: boards (mesmo padrão de db/migrations/0005, tabela clientes) ──────

DROP POLICY IF EXISTS boards_select ON public.boards;
DROP POLICY IF EXISTS boards_insert ON public.boards;
DROP POLICY IF EXISTS boards_update ON public.boards;
DROP POLICY IF EXISTS boards_delete ON public.boards;

CREATE POLICY boards_select ON public.boards
  FOR SELECT USING (public.can_access_org(org_id));
CREATE POLICY boards_insert ON public.boards
  FOR INSERT WITH CHECK (public.can_access_org(org_id));
CREATE POLICY boards_update ON public.boards
  FOR UPDATE USING (public.can_access_org(org_id)) WITH CHECK (public.can_access_org(org_id));
CREATE POLICY boards_delete ON public.boards
  FOR DELETE USING (public.is_platform_admin());

-- ─── RLS: board_columns (via join até boards.org_id) ────────────────────────

DROP POLICY IF EXISTS board_columns_select ON public.board_columns;
DROP POLICY IF EXISTS board_columns_insert ON public.board_columns;
DROP POLICY IF EXISTS board_columns_update ON public.board_columns;
DROP POLICY IF EXISTS board_columns_delete ON public.board_columns;

CREATE POLICY board_columns_select ON public.board_columns
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_columns.board_id AND public.can_access_org(b.org_id))
  );
CREATE POLICY board_columns_insert ON public.board_columns
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_columns.board_id AND public.can_access_org(b.org_id))
  );
CREATE POLICY board_columns_update ON public.board_columns
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_columns.board_id AND public.can_access_org(b.org_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_columns.board_id AND public.can_access_org(b.org_id))
  );
CREATE POLICY board_columns_delete ON public.board_columns
  FOR DELETE USING (public.is_platform_admin());

-- ─── RLS: board_cards (via join até boards.org_id) ──────────────────────────

DROP POLICY IF EXISTS board_cards_select ON public.board_cards;
DROP POLICY IF EXISTS board_cards_insert ON public.board_cards;
DROP POLICY IF EXISTS board_cards_update ON public.board_cards;
DROP POLICY IF EXISTS board_cards_delete ON public.board_cards;

CREATE POLICY board_cards_select ON public.board_cards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_cards.board_id AND public.can_access_org(b.org_id))
  );
CREATE POLICY board_cards_insert ON public.board_cards
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_cards.board_id AND public.can_access_org(b.org_id))
  );
CREATE POLICY board_cards_update ON public.board_cards
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_cards.board_id AND public.can_access_org(b.org_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_cards.board_id AND public.can_access_org(b.org_id))
  );
CREATE POLICY board_cards_delete ON public.board_cards
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_cards.board_id AND public.can_access_org(b.org_id))
  );

-- ─── RLS: mind_maps ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS mind_maps_select ON public.mind_maps;
DROP POLICY IF EXISTS mind_maps_insert ON public.mind_maps;
DROP POLICY IF EXISTS mind_maps_update ON public.mind_maps;
DROP POLICY IF EXISTS mind_maps_delete ON public.mind_maps;

CREATE POLICY mind_maps_select ON public.mind_maps
  FOR SELECT USING (public.can_access_org(org_id));
CREATE POLICY mind_maps_insert ON public.mind_maps
  FOR INSERT WITH CHECK (public.can_access_org(org_id));
CREATE POLICY mind_maps_update ON public.mind_maps
  FOR UPDATE USING (public.can_access_org(org_id)) WITH CHECK (public.can_access_org(org_id));
CREATE POLICY mind_maps_delete ON public.mind_maps
  FOR DELETE USING (public.can_access_org(org_id));

-- ─── RLS: crm_leads (dado comercial — só platform_admin, sem consultor) ─────

DROP POLICY IF EXISTS crm_leads_select ON public.crm_leads;
DROP POLICY IF EXISTS crm_leads_insert ON public.crm_leads;
DROP POLICY IF EXISTS crm_leads_update ON public.crm_leads;
DROP POLICY IF EXISTS crm_leads_delete ON public.crm_leads;

CREATE POLICY crm_leads_select ON public.crm_leads
  FOR SELECT USING (public.is_platform_admin());
CREATE POLICY crm_leads_insert ON public.crm_leads
  FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY crm_leads_update ON public.crm_leads
  FOR UPDATE USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY crm_leads_delete ON public.crm_leads
  FOR DELETE USING (public.is_platform_admin());

-- ─── Funções helper ──────────────────────────────────────────────────────────

-- Cria o primeiro board da org sob demanda (com as 4 colunas padrão do
-- protótipo) se ainda não existir nenhum, e retorna o id do board principal.
CREATE OR REPLACE FUNCTION public.get_or_create_default_board(p_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id uuid;
BEGIN
  IF NOT public.can_access_org(p_org_id) THEN
    RAISE EXCEPTION 'Acesso negado a esta organização';
  END IF;

  SELECT id INTO v_board_id
  FROM public.boards
  WHERE org_id = p_org_id
  ORDER BY position, created_at
  LIMIT 1;

  IF v_board_id IS NOT NULL THEN
    RETURN v_board_id;
  END IF;

  INSERT INTO public.boards (org_id, name, created_by)
  VALUES (p_org_id, 'Plano de Ação', auth.uid())
  RETURNING id INTO v_board_id;

  INSERT INTO public.board_columns (board_id, label, color, position) VALUES
    (v_board_id, 'A Fazer', '#94A3B8', 0),
    (v_board_id, 'Em Andamento', '#3B82F6', 1),
    (v_board_id, 'Revisão', '#EAB308', 2),
    (v_board_id, 'Concluído', '#22C55E', 3);

  RETURN v_board_id;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_default_board(uuid) IS
  'Retorna o board principal da org, criando com as 4 colunas padrão na primeira vez. Usado tanto pelo board interno da Land Grow quanto pela seção Atividades de cada cliente.';

GRANT EXECUTE ON FUNCTION public.get_or_create_default_board(uuid) TO authenticated;

-- Resumo do funil de CRM (contagem por estágio) — só platform_admin.
CREATE OR REPLACE FUNCTION public.admin_crm_summary()
RETURNS TABLE (estagio text, total bigint, valor_total numeric)
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
  SELECT l.estagio, count(*)::bigint, COALESCE(sum(l.valor_estimado), 0)
  FROM public.crm_leads l
  GROUP BY l.estagio;
END;
$$;

COMMENT ON FUNCTION public.admin_crm_summary() IS
  'Contagem e valor estimado por estágio do funil de CRM. Restrito a platform_admin.';

GRANT EXECUTE ON FUNCTION public.admin_crm_summary() TO authenticated;
