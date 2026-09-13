-- =============================================================================
-- Migration 0014 — Propriedades personalizadas por board
-- =============================================================================
-- Cada board pode ganhar propriedades extras (texto, número, data, select,
-- multiselect, checkbox, url, email, telefone) por cima do schema fixo de
-- board_cards — mesmo modelo do protótipo (public/preview/kanban.html,
-- PROP_TYPES). O schema da propriedade vive em board_properties; o valor
-- preenchido por card vive em board_cards.custom_values (jsonb), mesma
-- filosofia de subtarefas/comentarios já usada na 0012.
-- =============================================================================

CREATE TABLE public.board_properties (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id  uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  key       text NOT NULL,
  label     text NOT NULL,
  type      text NOT NULL CHECK (type IN
              ('text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url', 'email', 'phone')),
  options   jsonb NOT NULL DEFAULT '[]'::jsonb,
  position  int NOT NULL DEFAULT 0,
  visible   boolean NOT NULL DEFAULT true,
  UNIQUE (board_id, key)
);

COMMENT ON TABLE public.board_properties IS
  'Schema de propriedades personalizadas por board — o valor de cada uma fica em board_cards.custom_values.';

ALTER TABLE public.board_cards ADD COLUMN custom_values jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_board_properties_board_id ON public.board_properties (board_id, position);

-- ─── RLS: mesmo padrão via join de board_columns/board_cards (0012) ────────

ALTER TABLE public.board_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_properties FORCE ROW LEVEL SECURITY;

CREATE POLICY board_properties_select ON public.board_properties
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_properties.board_id AND public.can_access_org(b.org_id))
  );
CREATE POLICY board_properties_insert ON public.board_properties
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_properties.board_id AND public.can_access_org(b.org_id))
  );
CREATE POLICY board_properties_update ON public.board_properties
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_properties.board_id AND public.can_access_org(b.org_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_properties.board_id AND public.can_access_org(b.org_id))
  );
CREATE POLICY board_properties_delete ON public.board_properties
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_properties.board_id AND public.can_access_org(b.org_id))
  );
