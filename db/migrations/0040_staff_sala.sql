-- =============================================================================
-- Migration 0040 — Sala (canais da equipe Land Grow)
-- =============================================================================
-- Módulo HQ no formato Slack: canais, DM, mensagens, threads, reações.
-- O painel do cliente não vê nada disto.
-- =============================================================================

ALTER TABLE public.consultant_capabilities
  DROP CONSTRAINT IF EXISTS consultant_capabilities_capability_check;

ALTER TABLE public.consultant_capabilities
  ADD CONSTRAINT consultant_capabilities_capability_check
  CHECK (capability IN (
    'painel',
    'atividades',
    'mapa_mental',
    'crm',
    'clientes',
    'bin',
    'min',
    'financeiro',
    'metricas',
    'documentos',
    'sala',
    'acessos',
    'equipe',
    'audit_log'
  ));

INSERT INTO public.consultant_capabilities (consultant_id, capability)
SELECT DISTINCT consultant_id, 'sala'
FROM public.consultant_capabilities
WHERE capability IN ('atividades', 'equipe', 'clientes')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.staff_channels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('channel', 'dm')),
  slug        text,
  name        text NOT NULL,
  topic       text,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, slug)
);

COMMENT ON TABLE public.staff_channels IS
  'Canais e DMs da Sala HQ. Sem org de cliente — só equipe Land Grow.';

CREATE INDEX IF NOT EXISTS idx_staff_channels_kind
  ON public.staff_channels (kind, created_at);

CREATE TABLE IF NOT EXISTS public.staff_channel_members (
  channel_id   uuid NOT NULL REFERENCES public.staff_channels(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.staff_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.staff_channels(id) ON DELETE CASCADE,
  parent_id  uuid REFERENCES public.staff_messages(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body       text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_staff_messages_channel
  ON public.staff_messages (channel_id, created_at);

CREATE INDEX IF NOT EXISTS idx_staff_messages_parent
  ON public.staff_messages (parent_id, created_at)
  WHERE parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.staff_message_reactions (
  message_id uuid NOT NULL REFERENCES public.staff_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji      text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

DROP TRIGGER IF EXISTS trg_staff_channels_updated_at ON public.staff_channels;
CREATE TRIGGER trg_staff_channels_updated_at
  BEFORE UPDATE ON public.staff_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.staff_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_channels FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_channel_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_message_reactions FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_see_staff_channel(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.staff_can('sala')
    AND EXISTS (
      SELECT 1 FROM public.staff_channels c
      WHERE c.id = p_channel_id
        AND (
          c.kind = 'channel'
          OR EXISTS (
            SELECT 1 FROM public.staff_channel_members m
            WHERE m.channel_id = c.id AND m.user_id = auth.uid()
          )
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_see_staff_channel(uuid) TO authenticated;

DROP POLICY IF EXISTS staff_channels_select ON public.staff_channels;
DROP POLICY IF EXISTS staff_channels_write ON public.staff_channels;
CREATE POLICY staff_channels_select ON public.staff_channels
  FOR SELECT USING (public.can_see_staff_channel(id));
CREATE POLICY staff_channels_write ON public.staff_channels
  FOR ALL USING (public.staff_can('sala'))
  WITH CHECK (public.staff_can('sala'));

DROP POLICY IF EXISTS staff_channel_members_select ON public.staff_channel_members;
DROP POLICY IF EXISTS staff_channel_members_write ON public.staff_channel_members;
CREATE POLICY staff_channel_members_select ON public.staff_channel_members
  FOR SELECT USING (public.can_see_staff_channel(channel_id));
CREATE POLICY staff_channel_members_write ON public.staff_channel_members
  FOR ALL USING (public.staff_can('sala'))
  WITH CHECK (public.staff_can('sala'));

DROP POLICY IF EXISTS staff_messages_select ON public.staff_messages;
DROP POLICY IF EXISTS staff_messages_insert ON public.staff_messages;
CREATE POLICY staff_messages_select ON public.staff_messages
  FOR SELECT USING (public.can_see_staff_channel(channel_id));
CREATE POLICY staff_messages_insert ON public.staff_messages
  FOR INSERT WITH CHECK (
    public.can_see_staff_channel(channel_id)
    AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS staff_reactions_select ON public.staff_message_reactions;
DROP POLICY IF EXISTS staff_reactions_write ON public.staff_message_reactions;
CREATE POLICY staff_reactions_select ON public.staff_message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.staff_messages m
      WHERE m.id = message_id AND public.can_see_staff_channel(m.channel_id)
    )
  );
CREATE POLICY staff_reactions_write ON public.staff_message_reactions
  FOR ALL USING (public.staff_can('sala') AND user_id = auth.uid())
  WITH CHECK (public.staff_can('sala') AND user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_channel_members TO authenticated;
GRANT SELECT, INSERT ON public.staff_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.staff_message_reactions TO authenticated;

INSERT INTO public.staff_channels (kind, slug, name, topic)
VALUES
  ('channel', 'geral', 'geral', 'Sala da equipe Land Grow.'),
  ('channel', 'clientes', 'clientes', 'Carteira, sessões e o que o cliente não precisa ver.'),
  ('channel', 'operacao', 'operação', 'PULSO, prazo e o que está travado.')
ON CONFLICT (kind, slug) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_message_reactions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
