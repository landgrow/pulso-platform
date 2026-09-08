-- =============================================================================
-- Migration 0002 — Políticas RLS (default-deny + allow explicit)
-- =============================================================================
-- Princípio: default-deny. NENHUMA política "using (true)". Cada policy
-- sempre checa is_platform_admin() ou is_member_of() / member_role().
-- =============================================================================

-- ─── Helper functions (mover para 0003 em migrations futuras se crescer) ──────

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid() AND role = 'platform_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_consultant()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid() AND role = 'consultant'
  );
END;
$$;

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
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND org_id = $1
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
  SELECT role INTO v_role
  FROM public.memberships
  WHERE user_id = auth.uid() AND org_id = $1;

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

  -- platform_admin acessa tudo
  IF public.is_platform_admin() THEN
    RETURN true;
  END IF;

  -- consultant acessa orgs atribuídas
  IF public.is_consultant() THEN
    RETURN EXISTS (
      SELECT 1 FROM public.consultant_assignments
      WHERE consultant_id = auth.uid() AND org_id = $1
    );
  END IF;

  -- member da org
  RETURN public.is_member_of($1);
END;
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(org_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_rank int;
  v_required_rank int;
BEGIN
  v_role := public.member_role($1);

  -- Hierarquia: client_viewer < client_member < client_owner
  v_rank := CASE v_role
    WHEN 'client_owner'  THEN 3
    WHEN 'client_member' THEN 2
    WHEN 'client_viewer' THEN 1
    ELSE 0
  END;

  v_required_rank := CASE $2
    WHEN 'client_owner'  THEN 3
    WHEN 'client_member' THEN 2
    WHEN 'client_viewer' THEN 1
    ELSE 0
  END;

  RETURN v_rank >= v_required_rank;
END;
$$;

-- ─── policies: profiles ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;

-- SELECT: self, platform_admin, ou alguém da mesma org (via memberships)
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.memberships m1
      JOIN public.memberships m2 ON m1.org_id = m2.org_id
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = profiles.id
    )
  );

-- UPDATE: self, ou platform_admin
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE
  USING (id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (id = auth.uid() OR public.is_platform_admin());

-- INSERT: apenas via trigger (não permitir INSERT direto)
-- DELETE: apenas platform_admin
CREATE POLICY profiles_admin_delete ON public.profiles
  FOR DELETE
  USING (public.is_platform_admin());

-- ─── policies: organizations ────────────────────────────────────────────────

DROP POLICY IF EXISTS orgs_select ON public.organizations;
DROP POLICY IF EXISTS orgs_update ON public.organizations;
DROP POLICY IF EXISTS orgs_insert ON public.organizations;
DROP POLICY IF EXISTS orgs_delete ON public.organizations;

-- SELECT: platform_admin, consultant atribuído, ou member
CREATE POLICY orgs_select ON public.organizations
  FOR SELECT
  USING (public.can_access_org(id));

-- INSERT: apenas platform_admin (clientes não criam orgs via app)
CREATE POLICY orgs_insert ON public.organizations
  FOR INSERT
  WITH CHECK (public.is_platform_admin());

-- UPDATE: platform_admin ou client_owner da própria org
CREATE POLICY orgs_update ON public.organizations
  FOR UPDATE
  USING (
    public.is_platform_admin()
    OR public.has_org_role(id, 'client_owner')
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.has_org_role(id, 'client_owner')
  );

-- DELETE: apenas platform_admin
CREATE POLICY orgs_delete ON public.organizations
  FOR DELETE
  USING (public.is_platform_admin());

-- ─── policies: memberships ──────────────────────────────────────────────────

DROP POLICY IF EXISTS memberships_select ON public.memberships;
DROP POLICY IF EXISTS memberships_insert ON public.memberships;
DROP POLICY IF EXISTS memberships_update ON public.memberships;
DROP POLICY IF EXISTS memberships_delete ON public.memberships;

-- SELECT: platform_admin ou member da mesma org
CREATE POLICY memberships_select ON public.memberships
  FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.is_member_of(org_id)
    OR (
      public.is_consultant()
      AND EXISTS (
        SELECT 1 FROM public.consultant_assignments ca
        WHERE ca.consultant_id = auth.uid() AND ca.org_id = memberships.org_id
      )
    )
  );

-- INSERT: platform_admin ou client_owner da org
CREATE POLICY memberships_insert ON public.memberships
  FOR INSERT
  WITH CHECK (
    public.is_platform_admin()
    OR public.has_org_role(org_id, 'client_owner')
  );

-- UPDATE: platform_admin ou client_owner
CREATE POLICY memberships_update ON public.memberships
  FOR UPDATE
  USING (
    public.is_platform_admin()
    OR public.has_org_role(org_id, 'client_owner')
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.has_org_role(org_id, 'client_owner')
  );

-- DELETE: platform_admin ou client_owner
-- (e nunca o próprio user_id — um user não pode se remover se for o único owner)
CREATE POLICY memberships_delete ON public.memberships
  FOR DELETE
  USING (
    public.is_platform_admin()
    OR public.has_org_role(org_id, 'client_owner')
  );

-- ─── policies: platform_roles ───────────────────────────────────────────────

DROP POLICY IF EXISTS platform_roles_select ON public.platform_roles;
DROP POLICY IF EXISTS platform_roles_admin_all ON public.platform_roles;

-- SELECT: self ou outro platform_admin
CREATE POLICY platform_roles_select ON public.platform_roles
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin()
  );

-- INSERT/UPDATE/DELETE: apenas platform_admin
CREATE POLICY platform_roles_admin_all ON public.platform_roles
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ─── policies: consultant_assignments ───────────────────────────────────────

DROP POLICY IF EXISTS consultant_assign_select ON public.consultant_assignments;
DROP POLICY IF EXISTS consultant_assign_admin ON public.consultant_assignments;

CREATE POLICY consultant_assign_select ON public.consultant_assignments
  FOR SELECT
  USING (
    consultant_id = auth.uid()
    OR public.is_platform_admin()
    OR public.is_member_of(org_id)
  );

CREATE POLICY consultant_assign_admin ON public.consultant_assignments
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ─── policies: audit_log ────────────────────────────────────────────────────

DROP POLICY IF EXISTS audit_select ON public.audit_log;
DROP POLICY IF EXISTS audit_insert ON public.audit_log;

-- SELECT: platform_admin ou member da org
CREATE POLICY audit_select ON public.audit_log
  FOR SELECT
  USING (public.can_access_org(org_id));

-- INSERT: via trigger only (security definer function bypasses RLS)
-- Policy permite inserts com service_role key
CREATE POLICY audit_insert ON public.audit_log
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- UPDATE/DELETE: ninguém. Audit log é imutável.
-- (NÃO criamos policies de update/delete — sem policy = sem acesso)
