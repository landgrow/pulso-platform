-- =============================================================================
-- 0052 — RLS: viewer sem escrita; integrações só admin no write;
--         card_files DELETE com org; Sala arquivos/canvas no canal.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.org_member_can_write(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_org(p_org_id)
    AND COALESCE(public.member_role(p_org_id), '') IS DISTINCT FROM 'client_viewer';
$$;

REVOKE ALL ON FUNCTION public.org_member_can_write(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_member_can_write(uuid) TO authenticated;

-- Coleções / períodos / evidências: viewer lê, não grava.
DROP POLICY IF EXISTS periodos_insert ON public.periodos_dados;
CREATE POLICY periodos_insert ON public.periodos_dados
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = periodos_dados.cliente_id
        AND public.org_member_can_write(c.org_id)
    )
  );

DROP POLICY IF EXISTS periodos_update ON public.periodos_dados;
CREATE POLICY periodos_update ON public.periodos_dados
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = periodos_dados.cliente_id
        AND public.org_member_can_write(c.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = periodos_dados.cliente_id
        AND public.org_member_can_write(c.org_id)
    )
  );

DROP POLICY IF EXISTS colecoes_insert ON public.colecoes;
CREATE POLICY colecoes_insert ON public.colecoes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = colecoes.periodo_id
        AND public.org_member_can_write(c.org_id)
    )
  );

DROP POLICY IF EXISTS colecoes_update ON public.colecoes;
CREATE POLICY colecoes_update ON public.colecoes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = colecoes.periodo_id
        AND public.org_member_can_write(c.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = colecoes.periodo_id
        AND public.org_member_can_write(c.org_id)
    )
  );

DROP POLICY IF EXISTS evidencias_insert ON public.evidencias;
CREATE POLICY evidencias_insert ON public.evidencias
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = evidencias.periodo_id
        AND public.org_member_can_write(c.org_id)
    )
  );

DROP POLICY IF EXISTS evidencias_update ON public.evidencias;
CREATE POLICY evidencias_update ON public.evidencias
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = evidencias.periodo_id
        AND public.org_member_can_write(c.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = evidencias.periodo_id
        AND public.org_member_can_write(c.org_id)
    )
  );

-- Integrações HQ: consultant lê; só platform_admin grava.
DROP POLICY IF EXISTS workspace_integrations_staff ON public.workspace_integrations;
DROP POLICY IF EXISTS workspace_integrations_select ON public.workspace_integrations;
DROP POLICY IF EXISTS workspace_integrations_write ON public.workspace_integrations;
CREATE POLICY workspace_integrations_select ON public.workspace_integrations
  FOR SELECT
  USING (public.is_platform_admin() OR public.is_consultant());
CREATE POLICY workspace_integrations_write ON public.workspace_integrations
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS workspace_event_automations_staff ON public.workspace_event_automations;
DROP POLICY IF EXISTS workspace_event_automations_select ON public.workspace_event_automations;
DROP POLICY IF EXISTS workspace_event_automations_write ON public.workspace_event_automations;
CREATE POLICY workspace_event_automations_select ON public.workspace_event_automations
  FOR SELECT
  USING (public.is_platform_admin() OR public.is_consultant());
CREATE POLICY workspace_event_automations_write ON public.workspace_event_automations
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Arquivo de card: DELETE só na org que o staff alcança.
DROP POLICY IF EXISTS card_files_delete ON public.card_files;
CREATE POLICY card_files_delete ON public.card_files
  FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR public.is_platform_admin()
    OR (
      public.staff_can('atividades')
      AND EXISTS (
        SELECT 1
        FROM public.board_cards bc
        JOIN public.boards b ON b.id = bc.board_id
        WHERE bc.id = card_files.card_id
          AND public.can_access_org(b.org_id)
      )
    )
  );

-- Sala: canvas e arquivos seguem o mesmo recorte do canal (DM incluso).
DROP POLICY IF EXISTS staff_canvases_all ON public.staff_canvases;
CREATE POLICY staff_canvases_all ON public.staff_canvases
  FOR ALL
  USING (public.staff_can('sala') AND public.can_see_staff_channel(channel_id))
  WITH CHECK (public.staff_can('sala') AND public.can_see_staff_channel(channel_id));

DROP POLICY IF EXISTS staff_files_all ON public.staff_message_files;
CREATE POLICY staff_files_all ON public.staff_message_files
  FOR ALL
  USING (public.staff_can('sala') AND public.can_see_staff_channel(channel_id))
  WITH CHECK (public.staff_can('sala') AND public.can_see_staff_channel(channel_id));

DROP POLICY IF EXISTS staff_canvas_comments_all ON public.staff_canvas_comments;
CREATE POLICY staff_canvas_comments_all ON public.staff_canvas_comments
  FOR ALL
  USING (
    public.staff_can('sala')
    AND EXISTS (
      SELECT 1 FROM public.staff_canvases c
      WHERE c.id = staff_canvas_comments.canvas_id
        AND public.can_see_staff_channel(c.channel_id)
    )
  )
  WITH CHECK (
    public.staff_can('sala')
    AND EXISTS (
      SELECT 1 FROM public.staff_canvases c
      WHERE c.id = staff_canvas_comments.canvas_id
        AND public.can_see_staff_channel(c.channel_id)
    )
  );

DROP POLICY IF EXISTS staff_lists_all ON public.staff_lists;
CREATE POLICY staff_lists_all ON public.staff_lists
  FOR ALL
  USING (
    public.staff_can('sala')
    AND (channel_id IS NULL OR public.can_see_staff_channel(channel_id))
  )
  WITH CHECK (
    public.staff_can('sala')
    AND (channel_id IS NULL OR public.can_see_staff_channel(channel_id))
  );

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
    'cliente_atraso',
    'sala_mention'
  ));
