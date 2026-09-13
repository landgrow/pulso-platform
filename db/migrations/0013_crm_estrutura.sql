-- =============================================================================
-- Migration 0013 — CRM de verdade: Contas, Contatos, Negociações
-- =============================================================================
-- crm_leads (0012) vira 3 tabelas relacionadas, no mesmo modelo do CRM do
-- Monday que a Nayara pediu (Contas/Contatos/Negociações/Painel de Vendas).
-- crm_leads está vazia (nenhuma linha cadastrada ainda) — sem dado real pra
-- migrar, então é substituída, não alterada.
-- =============================================================================

DROP TABLE IF EXISTS public.crm_leads;

-- ─── Contas: empresas no radar da Land Grow (prospect ou já cliente) ───────

CREATE TABLE public.crm_contas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome              text NOT NULL,
  setor             text,
  porte             text,
  site              text,
  telefone          text,
  observacoes       text,
  converted_org_id  uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.crm_contas IS
  'Empresas no funil comercial da Land Grow. converted_org_id aponta pra organization real quando a conta vira cliente.';

-- ─── Contatos: pessoas dentro de uma conta ──────────────────────────────────

CREATE TABLE public.crm_contatos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conta_id    uuid REFERENCES public.crm_contas(id) ON DELETE SET NULL,
  nome        text NOT NULL,
  email       text,
  telefone    text,
  cargo       text,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Negociações: o funil de vendas em si ──────────────────────────────────

CREATE TABLE public.crm_negociacoes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conta_id            uuid REFERENCES public.crm_contas(id) ON DELETE SET NULL,
  contato_id          uuid REFERENCES public.crm_contatos(id) ON DELETE SET NULL,
  titulo              text NOT NULL,
  estagio             text NOT NULL DEFAULT 'novo'
                        CHECK (estagio IN ('novo', 'qualificando', 'proposta', 'negociacao', 'ganho', 'perdido')),
  servico_interesse   text CHECK (servico_interesse IN ('bin', 'scale', 'conselho', 'foco')),
  valor_estimado      numeric(12,2),
  proxima_acao        text,
  proxima_acao_data   date,
  responsavel_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  observacoes         text,
  created_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── Índices ────────────────────────────────────────────────────────────────

CREATE INDEX idx_crm_contas_org_id ON public.crm_contas (org_id);
CREATE INDEX idx_crm_contatos_org_id ON public.crm_contatos (org_id);
CREATE INDEX idx_crm_contatos_conta_id ON public.crm_contatos (conta_id);
CREATE INDEX idx_crm_negociacoes_org_id ON public.crm_negociacoes (org_id);
CREATE INDEX idx_crm_negociacoes_conta_id ON public.crm_negociacoes (conta_id);
CREATE INDEX idx_crm_negociacoes_estagio ON public.crm_negociacoes (estagio);

-- ─── Triggers updated_at ─────────────────────────────────────────────────────

CREATE TRIGGER trg_crm_contas_updated_at BEFORE UPDATE ON public.crm_contas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_crm_contatos_updated_at BEFORE UPDATE ON public.crm_contatos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_crm_negociacoes_updated_at BEFORE UPDATE ON public.crm_negociacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS: só platform_admin (dado comercial), mesma receita da 0012 ────────

ALTER TABLE public.crm_contas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contas       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contatos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contatos     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_negociacoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_negociacoes  FORCE ROW LEVEL SECURITY;

CREATE POLICY crm_contas_select ON public.crm_contas FOR SELECT USING (public.is_platform_admin());
CREATE POLICY crm_contas_insert ON public.crm_contas FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY crm_contas_update ON public.crm_contas FOR UPDATE USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY crm_contas_delete ON public.crm_contas FOR DELETE USING (public.is_platform_admin());

CREATE POLICY crm_contatos_select ON public.crm_contatos FOR SELECT USING (public.is_platform_admin());
CREATE POLICY crm_contatos_insert ON public.crm_contatos FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY crm_contatos_update ON public.crm_contatos FOR UPDATE USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY crm_contatos_delete ON public.crm_contatos FOR DELETE USING (public.is_platform_admin());

CREATE POLICY crm_negociacoes_select ON public.crm_negociacoes FOR SELECT USING (public.is_platform_admin());
CREATE POLICY crm_negociacoes_insert ON public.crm_negociacoes FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY crm_negociacoes_update ON public.crm_negociacoes FOR UPDATE USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY crm_negociacoes_delete ON public.crm_negociacoes FOR DELETE USING (public.is_platform_admin());
