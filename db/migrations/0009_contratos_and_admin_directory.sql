-- =============================================================================
-- Migration 0009 — Contratos + diretório de clientes para admin
-- =============================================================================
-- Fase 1 do ERP interno da Land Grow: rastreia o programa contratado por
-- cliente (BIN/Scale/Conselho/FOCO), valor, moeda e vigência, e expõe uma
-- função de diretório (dono + time + contratos) usada pelas telas
-- /admin/clientes e /admin/clientes/[slug].
--
-- `contratos` é uma tabela separada (não colunas em `clientes`) porque um
-- cliente pode comprar mais de um programa ao longo do tempo (ex: BIN em 2025,
-- Scale em 2026), ou programas simultâneos (ex: Scale + Conselho) — um
-- histórico append-only representa isso sem sobrescrever nada a cada renovação.
--
-- Nota: já existia uma tabela `contratos` no banco, vinda de uma linhagem de
-- migrations paralela (supabase/migrations/0002, nunca ligada ao app real) com
-- um desenho de jornada de contrato (fee_mensal/equity_percentual). Estava
-- vazia (0 linhas) e sem nenhum código em `src/` usando — removida abaixo
-- junto com a view que dependia dela, pra abrir espaço pro desenho desta
-- migration, que é o que foi pedido.
-- =============================================================================

DROP VIEW IF EXISTS public.sinal_qualificacao_fundo;
DROP TABLE IF EXISTS public.contratos CASCADE;
DROP TYPE IF EXISTS public.contrato_tipo;
DROP TYPE IF EXISTS public.contrato_status;

-- ─── Tabela: contratos (1:N com clientes) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contratos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  programa      text NOT NULL
                  CHECK (programa IN ('bin', 'scale', 'conselho', 'foco')),
  valor         numeric(12,2) NOT NULL CHECK (valor >= 0),
  moeda         text NOT NULL DEFAULT 'BRL'
                  CHECK (moeda IN ('BRL', 'USD', 'EUR')),
  data_inicio   date NOT NULL,
  data_fim      date,
  status        text NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo', 'pausado', 'encerrado')),
  observacoes   text,
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

COMMENT ON TABLE public.contratos IS
  'Histórico de contratos comerciais por cliente (programa, valor, duração, status). Um cliente pode ter múltiplos contratos ao longo do tempo e/ou simultâneos (ex: Scale + Conselho). Duração não é armazenada — é data_fim - data_inicio, calculada na leitura.';

-- Evita duas linhas 'ativo' pro MESMO programa no mesmo cliente
-- (não impede programas DIFERENTES ativos ao mesmo tempo).
CREATE UNIQUE INDEX IF NOT EXISTS idx_contratos_ativo_unico
  ON public.contratos (cliente_id, programa)
  WHERE status = 'ativo';

CREATE INDEX IF NOT EXISTS idx_contratos_cliente_id
  ON public.contratos (cliente_id);

CREATE INDEX IF NOT EXISTS idx_contratos_status
  ON public.contratos (status);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos FORCE ROW LEVEL SECURITY;

CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS: contratos ──────────────────────────────────────────────────────────
-- Leitura: quem já pode acessar a org do cliente (member/consultant/admin),
-- reaproveitando can_access_org(). Escrita: só platform_admin — dado
-- comercial/financeiro é administrativo da Land Grow, nem consultor nem o
-- próprio cliente edita.

CREATE POLICY contratos_select ON public.contratos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clientes cl
      WHERE cl.id = contratos.cliente_id
        AND public.can_access_org(cl.org_id)
    )
  );

CREATE POLICY contratos_insert ON public.contratos
  FOR INSERT
  WITH CHECK (public.is_platform_admin());

CREATE POLICY contratos_update ON public.contratos
  FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY contratos_delete ON public.contratos
  FOR DELETE
  USING (public.is_platform_admin());

-- ─── Auditoria: estende log_audit() pra cobrir contratos ────────────────────
-- CREATE OR REPLACE é aditivo — os triggers já existentes em
-- organizations/memberships/profiles continuam funcionando sem mudança.

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id      uuid;
  v_action      text;
  v_resource_id text;
BEGIN
  IF TG_TABLE_NAME = 'organizations' THEN
    v_org_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME IN ('memberships', 'audit_log') THEN
    v_org_id := COALESCE(NEW.org_id, OLD.org_id);
  ELSIF TG_TABLE_NAME = 'contratos' THEN
    SELECT org_id INTO v_org_id FROM public.clientes
    WHERE id = COALESCE(NEW.cliente_id, OLD.cliente_id);
  ELSE
    v_org_id := NULL;
  END IF;

  v_action := lower(TG_OP);
  v_resource_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END;

  INSERT INTO public.audit_log (org_id, user_id, action, resource_type, resource_id, metadata)
  VALUES (v_org_id, auth.uid(), v_action, TG_TABLE_NAME, v_resource_id,
    jsonb_build_object('schema', TG_TABLE_SCHEMA, 'op', TG_OP, 'old', to_jsonb(OLD), 'new', to_jsonb(NEW)));

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER trg_audit_contratos
  AFTER INSERT OR UPDATE OR DELETE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- ─── Função: admin_client_directory ──────────────────────────────────────────
-- Diretório completo de clientes pra área admin: dono, time (emails) e
-- contratos, numa linha por organização. Restrita a platform_admin/consultant
-- (a própria função verifica e lança erro se não for). Com p_org_id opcional,
-- a mesma função serve tanto a listagem geral (/admin/clientes) quanto a
-- página de detalhe de um cliente (/admin/clientes/[slug]).
--
-- Nota: lê auth.users.email dentro de uma função SECURITY DEFINER — mesmo
-- padrão já usado por handle_new_user() (migration 0003), que roda como
-- trigger sobre auth.users com o mesmo owner/privilégio.

CREATE OR REPLACE FUNCTION public.admin_client_directory(p_org_id uuid DEFAULT NULL)
RETURNS TABLE (
  org_id        uuid,
  slug          text,
  name          text,
  plan          text,
  cliente_id    uuid,
  owner_user_id uuid,
  owner_email   text,
  owner_name    text,
  member_emails text[],
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
    o.id, o.slug, o.name, o.plan, cl.id,
    owner_m.user_id, owner_u.email, owner_p.full_name,
    ARRAY(
      SELECT u.email FROM public.memberships m2
      JOIN auth.users u ON u.id = m2.user_id
      WHERE m2.org_id = o.id
      ORDER BY m2.created_at
    ),
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
    SELECT user_id, created_at FROM public.memberships
    WHERE org_id = o.id AND role = 'client_owner'
    ORDER BY created_at ASC LIMIT 1
  ) owner_m ON true
  LEFT JOIN auth.users owner_u ON owner_u.id = owner_m.user_id
  LEFT JOIN public.profiles owner_p ON owner_p.id = owner_m.user_id
  WHERE o.deleted_at IS NULL
    AND (p_org_id IS NULL OR o.id = p_org_id)
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.consultant_assignments ca
        WHERE ca.consultant_id = auth.uid() AND ca.org_id = o.id
      )
    )
  ORDER BY o.name;
END;
$$;

COMMENT ON FUNCTION public.admin_client_directory(uuid) IS
  'Lista completa (ou uma linha, se p_org_id for passado) de clientes para a área admin (dono, time, programa contratado, valor, contrato). Restrita a platform_admin/consultant.';

GRANT EXECUTE ON FUNCTION public.admin_client_directory(uuid) TO authenticated;
