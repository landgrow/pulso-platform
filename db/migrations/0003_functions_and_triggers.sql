-- =============================================================================
-- Migration 0003 — Funções e Triggers
-- =============================================================================
-- - Trigger para criar profile automaticamente quando user é criado
-- - Função genérica de audit log
-- - Triggers de audit em tabelas principais
-- =============================================================================

-- ─── Profile automático em auth.users ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Função genérica de audit log ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id    uuid;
  v_action    text;
  v_resource_id text;
BEGIN
  -- Determina org_id baseado na tabela
  IF TG_TABLE_NAME = 'organizations' THEN
    v_org_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME IN ('memberships', 'audit_log') THEN
    v_org_id := COALESCE(NEW.org_id, OLD.org_id);
  ELSE
    v_org_id := NULL;
  END IF;

  -- Determina action
  v_action := lower(TG_OP);

  -- Determina resource_id
  IF TG_OP = 'DELETE' THEN
    v_resource_id := OLD.id::text;
  ELSE
    v_resource_id := NEW.id::text;
  END IF;

  -- Insert no audit log
  INSERT INTO public.audit_log (
    org_id, user_id, action, resource_type, resource_id, metadata
  ) VALUES (
    v_org_id,
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    v_resource_id,
    jsonb_build_object(
      'schema', TG_TABLE_SCHEMA,
      'op', TG_OP,
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ─── Triggers de audit nas tabelas principais ───────────────────────────────
-- IMPORTANTE: NÃO adicionamos trigger na audit_log para evitar loop infinito.

DROP TRIGGER IF EXISTS trg_audit_orgs       ON public.organizations;
DROP TRIGGER IF EXISTS trg_audit_memberships ON public.memberships;
DROP TRIGGER IF EXISTS trg_audit_profiles   ON public.profiles;

CREATE TRIGGER trg_audit_orgs
  AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER trg_audit_memberships
  AFTER INSERT OR UPDATE OR DELETE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER trg_audit_profiles
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- ─── Helper: descobrir orgs que o user atual pode acessar ───────────────────

CREATE OR REPLACE FUNCTION public.my_accessible_orgs()
RETURNS TABLE (id uuid, slug text, name text, plan text, my_role text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_admin() THEN
    RETURN QUERY
      SELECT o.id, o.slug, o.name, o.plan, 'platform_admin'::text as my_role
      FROM public.organizations o
      WHERE o.deleted_at IS NULL
      ORDER BY o.name;
  ELSIF public.is_consultant() THEN
    RETURN QUERY
      SELECT o.id, o.slug, o.name, o.plan, 'consultant'::text as my_role
      FROM public.organizations o
      JOIN public.consultant_assignments ca ON ca.org_id = o.id
      WHERE ca.consultant_id = auth.uid()
        AND o.deleted_at IS NULL
      ORDER BY o.name;
  ELSE
    RETURN QUERY
      SELECT o.id, o.slug, o.name, o.plan, m.role as my_role
      FROM public.organizations o
      JOIN public.memberships m ON m.org_id = o.id
      WHERE m.user_id = auth.uid()
        AND o.deleted_at IS NULL
      ORDER BY o.name;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.my_accessible_orgs() IS
  'Lista todas as organizações que o usuário atual pode acessar, com o papel dele em cada uma.';
