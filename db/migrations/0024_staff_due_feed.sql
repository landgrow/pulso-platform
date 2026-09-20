-- Feed de prazos do staff: cards atrasados ou a vencer (clientes + org interna).
-- Realtime no board_cards para o Painel e o Dashboard atualizarem sozinhos.

CREATE OR REPLACE FUNCTION public.staff_due_cards(p_horizon_days integer DEFAULT 7)
RETURNS TABLE (
  card_id uuid,
  titulo text,
  prazo date,
  prioridade text,
  org_id uuid,
  org_name text,
  org_slug text,
  is_internal boolean,
  board_name text,
  column_label text,
  responsavel_nome text,
  related_org_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF NOT (
    public.staff_can('painel')
    OR public.staff_can('atividades')
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    bc.id,
    bc.titulo,
    bc.prazo,
    bc.prioridade,
    o.id,
    o.name,
    o.slug,
    o.is_internal,
    b.name,
    col.label,
    p.full_name,
    related.name
  FROM public.board_cards bc
  JOIN public.boards b ON b.id = bc.board_id
  JOIN public.board_columns col ON col.id = bc.column_id
  JOIN public.organizations o ON o.id = b.org_id
  LEFT JOIN public.profiles p ON p.id = bc.responsavel_id
  LEFT JOIN public.organizations related ON related.id = bc.related_org_id
  WHERE b.module = 'atividades'
    AND public.can_access_org(o.id)
    AND (b.kind <> 'admin_only' OR public.is_platform_admin())
    AND bc.prazo IS NOT NULL
    AND bc.prazo <= (current_date + GREATEST(p_horizon_days, 0))
    AND col.label !~* 'conclu|cancel'
  ORDER BY bc.prazo ASC, bc.prioridade ASC, bc.titulo ASC;
END;
$$;

COMMENT ON FUNCTION public.staff_due_cards(integer) IS
  'Cards de Atividades atrasados ou a vencer no horizonte (padrão 7 dias), nas orgs que o staff pode ver.';

GRANT EXECUTE ON FUNCTION public.staff_due_cards(integer) TO authenticated;

ALTER TABLE public.board_cards REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.board_cards;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
