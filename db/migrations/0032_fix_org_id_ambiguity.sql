-- O parâmetro org_id das funções de acesso tinha o mesmo nome da coluna.
-- Para um cliente (não admin), o SELECT da própria organização falhava com
-- "column reference org_id is ambiguous" e a ficha /{slug} caía em 404.

CREATE OR REPLACE FUNCTION public.is_member_of(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid() AND m.org_id = $1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.member_role(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT m.role INTO v_role
  FROM public.memberships m
  WHERE m.user_id = auth.uid() AND m.org_id = $1;

  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_org(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_platform_admin() THEN
    RETURN true;
  END IF;

  IF public.is_consultant() THEN
    IF EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = $1 AND o.is_internal
    ) THEN
      RETURN public.staff_can('atividades')
          OR public.staff_can('crm')
          OR public.staff_can('painel')
          OR public.staff_can('mapa_mental');
    END IF;

    RETURN EXISTS (
      SELECT 1 FROM public.consultant_assignments a
      WHERE a.consultant_id = auth.uid() AND a.org_id = $1
    );
  END IF;

  RETURN public.is_member_of($1);
END;
$$;
