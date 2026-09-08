-- =============================================================================
-- Migration 0011 — Diretório de equipe Land Grow (platform_admin/consultant)
-- =============================================================================
-- Suporta a tela /admin/equipe: listar quem tem acesso administrativo
-- (platform_admin = acesso total, consultant = restrito aos clientes
-- atribuídos via consultant_assignments), adicionar/remover pessoas, e
-- atribuir quais clientes cada consultor enxerga.
-- =============================================================================

-- Localiza um usuário existente pelo email — usado ao adicionar alguém que
-- já tem conta (ex: já é consultor de um cliente) sem reenviar convite.
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;

COMMENT ON FUNCTION public.find_user_id_by_email(text) IS
  'Localiza o id de um usuário pelo email. Usado ao adicionar alguém à equipe que já tem conta.';

GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;

-- Diretório da equipe Land Grow: quem é platform_admin/consultant, e quais
-- clientes cada consultor enxerga. Restrito a platform_admin — gerenciar
-- quem tem acesso administrativo não é algo que um consultant deveria ver.
CREATE OR REPLACE FUNCTION public.admin_team_directory()
RETURNS TABLE (
  user_id       uuid,
  email         text,
  full_name     text,
  role          text,
  assigned_orgs jsonb
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
  SELECT
    pr.user_id, u.email::text, p.full_name, pr.role,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('org_id', o.id, 'org_name', o.name) ORDER BY o.name)
      FROM public.consultant_assignments ca
      JOIN public.organizations o ON o.id = ca.org_id
      WHERE ca.consultant_id = pr.user_id
    ), '[]'::jsonb)
  FROM public.platform_roles pr
  JOIN auth.users u ON u.id = pr.user_id
  LEFT JOIN public.profiles p ON p.id = pr.user_id
  ORDER BY pr.role, u.email;
END;
$$;

COMMENT ON FUNCTION public.admin_team_directory() IS
  'Lista quem tem acesso administrativo (platform_admin/consultant) e, pra consultores, quais clientes foram atribuídos. Restrito a platform_admin.';

GRANT EXECUTE ON FUNCTION public.admin_team_directory() TO authenticated;
