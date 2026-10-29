-- =============================================================================
-- Migration 0054 — Contrato: arquivo no Drive + recorrência no Financeiro
-- =============================================================================
-- O cadastro na ficha do cliente grava o PDF em Documentos/Contratos, guarda
-- o caminho no contrato e gera as parcelas (único ou mensal) no ledger HQ.
-- =============================================================================

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS arquivo_path text,
  ADD COLUMN IF NOT EXISTS arquivo_nome text,
  ADD COLUMN IF NOT EXISTS recorrencia text NOT NULL DEFAULT 'unico';

DO $$
BEGIN
  ALTER TABLE public.contratos
    ADD CONSTRAINT contratos_recorrencia_check
    CHECK (recorrencia IN ('unico', 'mensal'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.admin_client_directory(p_org_id uuid DEFAULT NULL)
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
    owner_m.user_id, owner_u.email::text,
    COALESCE(NULLIF(btrim(owner_p.full_name), ''), NULLIF(btrim(cl.dono_nome), '')),
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
        'id', c.id,
        'programa', c.programa,
        'valor', c.valor,
        'moeda', c.moeda,
        'data_inicio', c.data_inicio,
        'data_fim', c.data_fim,
        'status', c.status,
        'recorrencia', c.recorrencia,
        'arquivo_path', c.arquivo_path,
        'arquivo_nome', c.arquivo_nome
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
    AND NOT o.is_internal
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
