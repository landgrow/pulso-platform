-- =============================================================================
-- Migration 0053 — Documentos no HQ (mesmo drive do portal, org interna)
-- =============================================================================
-- A constraint de capability já aceita 'documentos' desde 0040/0041.
-- Aqui: libera a função para consultores de operação e deixa a org interna
-- acessível via can_access_org quando a pessoa tem Documentos.
-- =============================================================================

INSERT INTO public.consultant_capabilities (consultant_id, capability)
SELECT DISTINCT consultant_id, 'documentos'
FROM public.consultant_capabilities
WHERE capability IN (
  'painel',
  'atividades',
  'mapa_mental',
  'crm',
  'sala',
  'calendario',
  'clientes',
  'bin',
  'min'
)
ON CONFLICT DO NOTHING;

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
          OR public.staff_can('mapa_mental')
          OR public.staff_can('documentos');
    END IF;

    RETURN EXISTS (
      SELECT 1 FROM public.consultant_assignments a
      WHERE a.consultant_id = auth.uid() AND a.org_id = $1
    );
  END IF;

  RETURN public.is_member_of($1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_org(uuid) TO authenticated;
