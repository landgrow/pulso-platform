-- =============================================================================
-- Migration 0041 — Calendário HQ + Sala completa (fluxos, canvas, listas, arquivos)
-- =============================================================================
-- Continua HQ-only. O painel do cliente não vê nada disto.
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
    'calendario',
    'acessos',
    'equipe',
    'audit_log'
  ));

INSERT INTO public.consultant_capabilities (consultant_id, capability)
SELECT DISTINCT consultant_id, 'calendario'
FROM public.consultant_capabilities
WHERE capability IN ('sala', 'atividades', 'equipe')
ON CONFLICT DO NOTHING;

ALTER TABLE public.staff_messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'user';

ALTER TABLE public.staff_messages
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  ALTER TABLE public.staff_messages
    ADD CONSTRAINT staff_messages_kind_check
    CHECK (kind IN ('user', 'bot', 'system'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.staff_channels (kind, slug, name, topic)
VALUES (
  'channel',
  'pulso',
  'pulso',
  'Pergunte à operação: agenda, CRM, prazos e clientes.'
)
ON CONFLICT (kind, slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.staff_calendar_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  kind        text NOT NULL DEFAULT 'interno'
                CHECK (kind IN ('reuniao', 'interno', 'circulo', 'lembrete')),
  org_id      uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  meeting_id  uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  channel_id  uuid REFERENCES public.staff_channels(id) ON DELETE SET NULL,
  link        text,
  notes       text,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_calendar_starts
  ON public.staff_calendar_events (starts_at);

CREATE TABLE IF NOT EXISTS public.staff_canvases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  uuid NOT NULL UNIQUE REFERENCES public.staff_channels(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'Canvas',
  body        text NOT NULL DEFAULT '',
  updated_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_lists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  uuid REFERENCES public.staff_channels(id) ON DELETE CASCADE,
  title       text NOT NULL,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_list_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id      uuid NOT NULL REFERENCES public.staff_lists(id) ON DELETE CASCADE,
  title        text NOT NULL,
  done         boolean NOT NULL DEFAULT false,
  due_on       date,
  assignee_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sort         int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_message_files (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  uuid NOT NULL REFERENCES public.staff_channels(id) ON DELETE CASCADE,
  message_id  uuid REFERENCES public.staff_messages(id) ON DELETE SET NULL,
  name        text NOT NULL,
  path        text NOT NULL,
  mime        text,
  size_bytes  int,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_workflows (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  prompt       text NOT NULL DEFAULT '',
  enabled      boolean NOT NULL DEFAULT false,
  trigger      jsonb NOT NULL,
  action       jsonb NOT NULL,
  last_run_at  timestamptz,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_workflow_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id  uuid NOT NULL REFERENCES public.staff_workflows(id) ON DELETE CASCADE,
  ran_at       timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL CHECK (status IN ('ok', 'skip', 'error')),
  detail       text
);

CREATE TABLE IF NOT EXISTS public.staff_circulos (
  channel_id  uuid PRIMARY KEY REFERENCES public.staff_channels(id) ON DELETE CASCADE,
  started_by  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at  timestamptz NOT NULL DEFAULT now(),
  event_id    uuid REFERENCES public.staff_calendar_events(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.staff_circulo_peers (
  channel_id  uuid NOT NULL REFERENCES public.staff_channels(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

DROP TRIGGER IF EXISTS trg_staff_workflows_updated_at ON public.staff_workflows;
CREATE TRIGGER trg_staff_workflows_updated_at
  BEFORE UPDATE ON public.staff_workflows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_staff_canvases_updated_at ON public.staff_canvases;
CREATE TRIGGER trg_staff_canvases_updated_at
  BEFORE UPDATE ON public.staff_canvases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.can_use_staff_ops()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.staff_can('sala') OR public.staff_can('calendario');
$$;

GRANT EXECUTE ON FUNCTION public.can_use_staff_ops() TO authenticated;

ALTER TABLE public.staff_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_calendar_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_canvases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_lists FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_list_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_message_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_message_files FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_workflows FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_workflow_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_circulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_circulos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_circulo_peers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_circulo_peers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_calendar_all ON public.staff_calendar_events;
CREATE POLICY staff_calendar_all ON public.staff_calendar_events
  FOR ALL USING (public.can_use_staff_ops())
  WITH CHECK (public.can_use_staff_ops());

DROP POLICY IF EXISTS staff_canvases_all ON public.staff_canvases;
CREATE POLICY staff_canvases_all ON public.staff_canvases
  FOR ALL USING (public.staff_can('sala'))
  WITH CHECK (public.staff_can('sala'));

DROP POLICY IF EXISTS staff_lists_all ON public.staff_lists;
CREATE POLICY staff_lists_all ON public.staff_lists
  FOR ALL USING (public.staff_can('sala'))
  WITH CHECK (public.staff_can('sala'));

DROP POLICY IF EXISTS staff_list_items_all ON public.staff_list_items;
CREATE POLICY staff_list_items_all ON public.staff_list_items
  FOR ALL USING (public.staff_can('sala'))
  WITH CHECK (public.staff_can('sala'));

DROP POLICY IF EXISTS staff_files_all ON public.staff_message_files;
CREATE POLICY staff_files_all ON public.staff_message_files
  FOR ALL USING (public.staff_can('sala'))
  WITH CHECK (public.staff_can('sala'));

DROP POLICY IF EXISTS staff_workflows_all ON public.staff_workflows;
CREATE POLICY staff_workflows_all ON public.staff_workflows
  FOR ALL USING (public.staff_can('sala'))
  WITH CHECK (public.staff_can('sala'));

DROP POLICY IF EXISTS staff_workflow_runs_all ON public.staff_workflow_runs;
CREATE POLICY staff_workflow_runs_all ON public.staff_workflow_runs
  FOR ALL USING (public.staff_can('sala'))
  WITH CHECK (public.staff_can('sala'));

DROP POLICY IF EXISTS staff_circulos_all ON public.staff_circulos;
CREATE POLICY staff_circulos_all ON public.staff_circulos
  FOR ALL USING (public.staff_can('sala'))
  WITH CHECK (public.staff_can('sala'));

DROP POLICY IF EXISTS staff_circulo_peers_all ON public.staff_circulo_peers;
CREATE POLICY staff_circulo_peers_all ON public.staff_circulo_peers
  FOR ALL USING (public.staff_can('sala'))
  WITH CHECK (public.staff_can('sala'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_calendar_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_canvases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_list_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_message_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_workflows TO authenticated;
GRANT SELECT, INSERT ON public.staff_workflow_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_circulos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_circulo_peers TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_calendar_events;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_circulo_peers;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
