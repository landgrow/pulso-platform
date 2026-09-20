-- =============================================================================
-- Migration 0029 — Drive da Land Grow + avisos de card (comentário/arquivo/cliente)
-- =============================================================================

ALTER TABLE public.notification_prefs
  ADD COLUMN IF NOT EXISTS comentario boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS arquivo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS card_cliente boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cliente_atraso boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.notification_prefs.comentario IS
  'E-mail quando alguém comenta num card que a pessoa acompanha.';
COMMENT ON COLUMN public.notification_prefs.arquivo IS
  'E-mail quando sobe ou se anexa arquivo no card.';
COMMENT ON COLUMN public.notification_prefs.card_cliente IS
  'Só equipe: e-mail quando o cliente cria ou atualiza um card.';
COMMENT ON COLUMN public.notification_prefs.cliente_atraso IS
  'Só equipe: e-mail quando uma tarefa do cliente passa do prazo.';

ALTER TABLE public.notification_deliveries
  DROP CONSTRAINT IF EXISTS notification_deliveries_kind_check;

ALTER TABLE public.notification_deliveries
  ADD CONSTRAINT notification_deliveries_kind_check
  CHECK (kind IN (
    'prazo',
    'reuniao',
    'resumo',
    'comentario',
    'arquivo',
    'card_cliente',
    'cliente_atraso'
  ));

-- Conta Google Drive da Land Grow (refresh token só via service_role).
CREATE TABLE IF NOT EXISTS public.google_drive_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connected_by    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_email   text NOT NULL,
  refresh_token   text NOT NULL,
  root_folder_id  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.google_drive_accounts IS
  'OAuth do Drive da Land Grow. Sem policy de authenticated: só o job/actions com service_role leem o token.';

ALTER TABLE public.google_drive_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_drive_accounts FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.org_drive_folders (
  org_id     uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  folder_id  text NOT NULL,
  folder_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.org_drive_folders IS
  'Pasta PULSO/{cliente} no Drive da Land Grow.';

ALTER TABLE public.org_drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_drive_folders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_drive_folders_select ON public.org_drive_folders;
CREATE POLICY org_drive_folders_select ON public.org_drive_folders
  FOR SELECT USING (public.can_access_org(org_id) OR public.is_platform_admin());

CREATE TABLE IF NOT EXISTS public.card_files (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id        uuid NOT NULL REFERENCES public.board_cards(id) ON DELETE CASCADE,
  drive_file_id  text,
  name           text NOT NULL,
  mime_type      text,
  web_view_link  text NOT NULL,
  uploaded_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_files_card ON public.card_files (card_id);

COMMENT ON TABLE public.card_files IS
  'Arquivos do card: arquivo no Drive da Land Grow ou link colado.';

ALTER TABLE public.card_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_files FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS card_files_select ON public.card_files;
CREATE POLICY card_files_select ON public.card_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.board_cards bc
      JOIN public.boards b ON b.id = bc.board_id
      WHERE bc.id = card_files.card_id
        AND (public.can_access_org(b.org_id) OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS card_files_insert ON public.card_files;
CREATE POLICY card_files_insert ON public.card_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.board_cards bc
      JOIN public.boards b ON b.id = bc.board_id
      WHERE bc.id = card_files.card_id
        AND (public.can_access_org(b.org_id) OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS card_files_delete ON public.card_files;
CREATE POLICY card_files_delete ON public.card_files
  FOR DELETE USING (
    uploaded_by = auth.uid()
    OR public.is_platform_admin()
    OR public.staff_can('atividades')
  );
