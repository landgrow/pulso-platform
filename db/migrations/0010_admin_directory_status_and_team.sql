-- =============================================================================
-- Migration 0010 — Status do cliente + diretório inclui encerrados
-- =============================================================================
-- Complementa a Fase 1: admin_client_directory() passa a incluir clientes
-- encerrados (deleted_at preenchido) em vez de escondê-los — a área admin
-- precisa continuar enxergando o histórico (ex: caso Lígia Covre), só o
-- my_accessible_orgs() (usado pelo próprio cliente/org-switcher) continua
-- filtrando deleted_at IS NULL, tirando o acesso de quem foi encerrado.
-- =============================================================================

-- O Postgres não deixa CREATE OR REPLACE mudar as colunas de retorno de uma
-- função existente — precisa apagar antes. Sem isso, esse DROP silenciosamente
-- falha e a versão antiga (com um bug de coluna ambígua) continua ativa.
DROP FUNCTION IF EXISTS public.admin_client_directory(uuid);

CREATE FUNCTION public.admin_client_directory(p_org_id uuid DEFAULT NULL)
RETURNS TABLE (
  org_id        uuid,
  slug          text,
  name          text,
  plan          text,
  deleted_at    timestamptz,
  cliente_id    uuid,
  owner_user_id uuid,
  owner_email   text,
  owner_name    text,
  member_emails text[],
  members       jsonb,
  contratos     jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_platform_admin() OR public.is_consultant()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas platform_admin ou consultant';
  END IF;

  RETURN QUERY
  SELECT
    o.id, o.slug, o.name, o.plan, o.deleted_at, cl.id,
    owner_m.user_id, owner_u.email::text, owner_p.full_name,
    ARRAY(
      SELECT u.email::text FROM public.memberships m2
      JOIN auth.users u ON u.id = m2.user_id
      WHERE m2.org_id = o.id
      ORDER BY m2.created_at
    ),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', m3.user_id, 'email', u3.email, 'role', m3.role
      ) ORDER BY m3.created_at)
      FROM public.memberships m3
      JOIN auth.users u3 ON u3.id = m3.user_id
      WHERE m3.org_id = o.id
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'programa', c.programa, 'valor', c.valor, 'moeda', c.moeda,
        'data_inicio', c.data_inicio, 'data_fim', c.data_fim, 'status', c.status
      ) ORDER BY c.data_inicio DESC)
      FROM public.contratos c WHERE c.cliente_id = cl.id
    ), '[]'::jsonb)
  FROM public.organizations o
  LEFT JOIN public.clientes cl ON cl.org_id = o.id
  LEFT JOIN LATERAL (
    SELECT mo.user_id, mo.created_at FROM public.memberships mo
    WHERE mo.org_id = o.id AND mo.role = 'client_owner'
    ORDER BY mo.created_at ASC LIMIT 1
  ) owner_m ON true
  LEFT JOIN auth.users owner_u ON owner_u.id = owner_m.user_id
  LEFT JOIN public.profiles owner_p ON owner_p.id = owner_m.user_id
  WHERE (p_org_id IS NULL OR o.id = p_org_id)
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.consultant_assignments ca
        WHERE ca.consultant_id = auth.uid() AND ca.org_id = o.id
      )
    )
  ORDER BY o.deleted_at NULLS FIRST, o.name;
END;
$$;

COMMENT ON FUNCTION public.admin_client_directory(uuid) IS
  'Lista completa (ou uma linha, se p_org_id for passado) de clientes para a área admin, incluindo encerrados (deleted_at preenchido) — diferente de my_accessible_orgs(), que filtra deleted_at IS NULL pro próprio cliente. Restrita a platform_admin/consultant.';
