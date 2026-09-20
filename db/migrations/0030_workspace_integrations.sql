-- =============================================================================
-- Migration 0030 — Integrações e automações criáveis no hub
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_integrations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN (
    'email', 'drive', 'google_login', 'whatsapp', 'calendar', 'notion', 'webhook'
  )),
  name        text NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('connected', 'pending', 'disabled')),
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_integrations_singleton
  ON public.workspace_integrations (kind)
  WHERE kind IN ('email', 'drive', 'google_login');

COMMENT ON TABLE public.workspace_integrations IS
  'Conectores da Land Grow. E-mail e Drive são únicos; webhook/WhatsApp podem repetir.';

ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_integrations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_integrations_staff ON public.workspace_integrations;
CREATE POLICY workspace_integrations_staff ON public.workspace_integrations
  FOR ALL
  USING (public.is_platform_admin() OR public.is_consultant())
  WITH CHECK (public.is_platform_admin() OR public.is_consultant());

CREATE TABLE IF NOT EXISTS public.workspace_event_automations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  trigger     text NOT NULL CHECK (trigger IN (
    'prazo', 'comentario', 'arquivo', 'card_cliente', 'cliente_atraso', 'reuniao'
  )),
  channel     text NOT NULL CHECK (channel IN ('email', 'webhook')),
  enabled     boolean NOT NULL DEFAULT true,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workspace_event_automations IS
  'Quando X acontece, manda e-mail ou chama webhook. Criada no hub de Integrações.';

ALTER TABLE public.workspace_event_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_event_automations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_event_automations_staff ON public.workspace_event_automations;
CREATE POLICY workspace_event_automations_staff ON public.workspace_event_automations
  FOR ALL
  USING (public.is_platform_admin() OR public.is_consultant())
  WITH CHECK (public.is_platform_admin() OR public.is_consultant());

INSERT INTO public.workspace_event_automations (name, trigger, channel, enabled)
SELECT v.name, v.trigger, 'email', true
FROM (VALUES
  ('Avisar prazo atrasado ou perto de vencer', 'prazo'),
  ('Avisar comentário no card', 'comentario'),
  ('Avisar arquivo no card', 'arquivo'),
  ('Avisar quando o cliente mexer no card', 'card_cliente'),
  ('Avisar atraso do cliente', 'cliente_atraso'),
  ('Avisar reunião hoje ou amanhã', 'reuniao')
) AS v(name, trigger)
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_event_automations e
  WHERE e.trigger = v.trigger AND e.channel = 'email'
);
