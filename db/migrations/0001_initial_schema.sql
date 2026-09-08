-- =============================================================================
-- Migration 0001 — Schema inicial
-- =============================================================================
-- Cria as tabelas multi-tenant base do PULSO.
-- IMPORTANTE: RLS é habilitado AQUI (não na 0002) para garantir que toda
-- nova tabela já nasce com RLS ligado. Default-deny é aplicado na 0002.
-- =============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ─── Tabelas ────────────────────────────────────────────────────────────────

-- Perfis de usuário (1:1 com auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS
  'Perfil público do usuário. Criado automaticamente via trigger em auth.users.';

-- Organizações (tenants)
CREATE TABLE IF NOT EXISTS public.organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  plan        text NOT NULL DEFAULT 'trial'
                CHECK (plan IN ('trial', 'starter', 'pro', 'enterprise')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

COMMENT ON TABLE public.organizations IS
  'Organizações (empresas clientes) — tenant raiz do PULSO.';

-- Memberships (associação user <-> org com papel)
CREATE TABLE IF NOT EXISTS public.memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role        text NOT NULL
                CHECK (role IN ('client_owner', 'client_member', 'client_viewer')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  -- Um user só pode ter um papel por org
  UNIQUE (user_id, org_id)
);

COMMENT ON TABLE public.memberships IS
  'Associação user-org com papel. Roles de plataforma (platform_admin, consultant) ficam em uma tabela separada para evitar confusão.';

-- Papéis de plataforma (Land Grow staff) — separados das memberships de cliente
CREATE TABLE IF NOT EXISTS public.platform_roles (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL
                CHECK (role IN ('platform_admin', 'consultant')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_roles IS
  'Papéis de plataforma (Land Grow). platform_admin: total. consultant: read-only nas orgs atribuídas.';

-- Atribuições de consultores a organizações
CREATE TABLE IF NOT EXISTS public.consultant_assignments (
  consultant_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id         uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  assigned_by    uuid REFERENCES auth.users(id),

  PRIMARY KEY (consultant_id, org_id)
);

COMMENT ON TABLE public.consultant_assignments IS
  'Quais consultores da Land Grow estão atribuídos a quais orgs de clientes.';

-- Audit log (imutável)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action        text NOT NULL,         -- 'create', 'update', 'delete', 'login', etc.
  resource_type text NOT NULL,         -- 'organization', 'membership', 'profile', etc.
  resource_id   text,                  -- ID do recurso afetado
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_log IS
  'Log imutável de ações sensíveis. Apenas INSERT é permitido via trigger.';

-- ─── Habilitar RLS em todas as tabelas ──────────────────────────────────────
-- IMPORTANTE: Habilitar RLS antes de criar políticas. FORCE garante que até
-- o dono da tabela é restringido (exceto postgres superuser).

ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log              ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organizations          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.memberships            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.platform_roles         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_assignments  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log              FORCE ROW LEVEL SECURITY;

-- ─── Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_memberships_user_id
  ON public.memberships (user_id);

CREATE INDEX IF NOT EXISTS idx_memberships_org_id
  ON public.memberships (org_id);

CREATE INDEX IF NOT EXISTS idx_memberships_org_role
  ON public.memberships (org_id, role);

CREATE INDEX IF NOT EXISTS idx_consultant_assignments_org
  ON public.consultant_assignments (org_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_org_created
  ON public.audit_log (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON public.audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organizations_slug
  ON public.organizations (slug);

-- updated_at trigger genérico
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at       ON public.profiles;
DROP TRIGGER IF EXISTS trg_organizations_updated_at  ON public.organizations;
DROP TRIGGER IF EXISTS trg_memberships_updated_at    ON public.memberships;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
