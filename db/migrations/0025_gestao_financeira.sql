-- =============================================================================
-- Migration 0025 — Gestão financeira da Land Grow (HQ)
-- =============================================================================
-- Recorte comum dos ERPs BR (Conta Azul, Omie, Nibo, Granatum): contas,
-- categorias, lançamentos (entrar/sair + previsto/realizado), notas,
-- impostos e deduções. Livro-caixa da operação interna — não é Open Finance
-- e não é o financeiro do cliente. Liga em contratos (a receber) e no
-- dashboard via caixa realizado.
-- =============================================================================

-- ─── Contas (caixa, banco, cartão) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_accounts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  kind             text NOT NULL DEFAULT 'caixa'
                     CHECK (kind IN ('caixa', 'banco', 'cartao')),
  bank_name        text,
  initial_balance  numeric(14,2) NOT NULL DEFAULT 0,
  currency         text NOT NULL DEFAULT 'BRL'
                     CHECK (currency IN ('BRL', 'USD', 'EUR')),
  archived         boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.finance_accounts IS
  'Contas de tesouraria da Land Grow (caixa, banco PJ, cartão).';

CREATE INDEX IF NOT EXISTS idx_finance_accounts_org
  ON public.finance_accounts (org_id, archived, name);

DROP TRIGGER IF EXISTS trg_finance_accounts_updated_at ON public.finance_accounts;
CREATE TRIGGER trg_finance_accounts_updated_at
  BEFORE UPDATE ON public.finance_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Categorias (receita, despesa, imposto, dedução) ─────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name       text NOT NULL,
  slug       text NOT NULL,
  kind       text NOT NULL
               CHECK (kind IN ('receita', 'despesa', 'imposto', 'deducao')),
  is_system  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, slug)
);

COMMENT ON TABLE public.finance_categories IS
  'Plano de contas simples. Seed de sistema não deve ser apagado pela UI.';

CREATE INDEX IF NOT EXISTS idx_finance_categories_org
  ON public.finance_categories (org_id, kind, name);

-- ─── Lançamentos ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_entries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id           uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  category_id          uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  kind                 text NOT NULL CHECK (kind IN ('entrada', 'saida')),
  status               text NOT NULL DEFAULT 'previsto'
                         CHECK (status IN ('previsto', 'realizado', 'cancelado')),
  amount               numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency             text NOT NULL DEFAULT 'BRL'
                         CHECK (currency IN ('BRL', 'USD', 'EUR')),
  competence_date      date NOT NULL,
  due_date             date,
  paid_at              date,
  description          text NOT NULL,
  notes                text,
  source               text NOT NULL DEFAULT 'manual'
                         CHECK (source IN ('manual', 'contrato', 'nota', 'imposto', 'deducao')),
  related_org_id       uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  related_contrato_id  uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  related_invoice_id   uuid,
  related_tax_id       uuid,
  created_by           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.finance_entries IS
  'Livro-caixa: entrada/saída com previsto (a receber/pagar) e realizado (caixa).';

CREATE INDEX IF NOT EXISTS idx_finance_entries_org_comp
  ON public.finance_entries (org_id, competence_date DESC);

CREATE INDEX IF NOT EXISTS idx_finance_entries_status
  ON public.finance_entries (org_id, status, kind);

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_entries_contrato
  ON public.finance_entries (related_contrato_id)
  WHERE related_contrato_id IS NOT NULL AND source = 'contrato';

DROP TRIGGER IF EXISTS trg_finance_entries_updated_at ON public.finance_entries;
CREATE TRIGGER trg_finance_entries_updated_at
  BEFORE UPDATE ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Notas (NF-e / NFS-e / recibo) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  number           text NOT NULL,
  series           text,
  kind             text NOT NULL DEFAULT 'nfse'
                     CHECK (kind IN ('nfe', 'nfse', 'nfce', 'recibo')),
  status           text NOT NULL DEFAULT 'rascunho'
                     CHECK (status IN ('rascunho', 'emitida', 'cancelada')),
  issue_date       date NOT NULL,
  amount           numeric(14,2) NOT NULL CHECK (amount >= 0),
  tax_amount       numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  description      text,
  recipient_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  entry_id         uuid REFERENCES public.finance_entries(id) ON DELETE SET NULL,
  created_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.finance_invoices IS
  'Registro de notas da Land Grow (NFS-e de serviço em geral). Emissão SEFAZ fica para depois.';

CREATE INDEX IF NOT EXISTS idx_finance_invoices_org
  ON public.finance_invoices (org_id, issue_date DESC);

DROP TRIGGER IF EXISTS trg_finance_invoices_updated_at ON public.finance_invoices;
CREATE TRIGGER trg_finance_invoices_updated_at
  BEFORE UPDATE ON public.finance_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Impostos ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_taxes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind         text NOT NULL
                 CHECK (kind IN ('das', 'iss', 'irpj', 'csll', 'pis', 'cofins', 'inss', 'outros')),
  period_start date NOT NULL,
  period_end   date NOT NULL,
  base_amount  numeric(14,2) NOT NULL DEFAULT 0 CHECK (base_amount >= 0),
  rate         numeric(7,4) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  amount       numeric(14,2) NOT NULL CHECK (amount >= 0),
  status       text NOT NULL DEFAULT 'previsto'
                 CHECK (status IN ('previsto', 'pago', 'atrasado')),
  due_date     date NOT NULL,
  paid_at      date,
  notes        text,
  entry_id     uuid REFERENCES public.finance_entries(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

COMMENT ON TABLE public.finance_taxes IS
  'Apuração de impostos da Land Grow (DAS, ISS, IR etc.). Não substitui o contador.';

CREATE INDEX IF NOT EXISTS idx_finance_taxes_org
  ON public.finance_taxes (org_id, due_date DESC);

DROP TRIGGER IF EXISTS trg_finance_taxes_updated_at ON public.finance_taxes;
CREATE TRIGGER trg_finance_taxes_updated_at
  BEFORE UPDATE ON public.finance_taxes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Deduções ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_deductions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_id       uuid REFERENCES public.finance_taxes(id) ON DELETE SET NULL,
  kind         text NOT NULL DEFAULT 'despesa_dedutivel'
                 CHECK (kind IN ('despesa_dedutivel', 'credito', 'isencao', 'outros')),
  description  text NOT NULL,
  amount       numeric(14,2) NOT NULL CHECK (amount >= 0),
  period_start date NOT NULL,
  period_end   date NOT NULL,
  entry_id     uuid REFERENCES public.finance_entries(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

COMMENT ON TABLE public.finance_deductions IS
  'Deduções e créditos que reduzem a base do DRE/imposto no período.';

CREATE INDEX IF NOT EXISTS idx_finance_deductions_org
  ON public.finance_deductions (org_id, period_start DESC);

-- FK tardia dos lançamentos para nota/imposto (evita ciclo na criação)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_entries_invoice_fkey'
  ) THEN
    ALTER TABLE public.finance_entries
      ADD CONSTRAINT finance_entries_invoice_fkey
      FOREIGN KEY (related_invoice_id) REFERENCES public.finance_invoices(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_entries_tax_fkey'
  ) THEN
    ALTER TABLE public.finance_entries
      ADD CONSTRAINT finance_entries_tax_fkey
      FOREIGN KEY (related_tax_id) REFERENCES public.finance_taxes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── Seed da org interna ─────────────────────────────────────────────────────

INSERT INTO public.finance_accounts (org_id, name, kind, initial_balance)
SELECT o.id, v.name, v.kind, 0
FROM public.organizations o
CROSS JOIN (VALUES
  ('Caixa', 'caixa'),
  ('Banco PJ', 'banco')
) AS v(name, kind)
WHERE o.is_internal = true
  AND NOT EXISTS (
    SELECT 1 FROM public.finance_accounts a
    WHERE a.org_id = o.id AND a.name = v.name
  );

INSERT INTO public.finance_categories (org_id, name, slug, kind, is_system)
SELECT o.id, v.name, v.slug, v.kind, true
FROM public.organizations o
CROSS JOIN (VALUES
  ('BIN', 'receita-bin', 'receita'),
  ('Scale', 'receita-scale', 'receita'),
  ('Conselho', 'receita-conselho', 'receita'),
  ('FOCO', 'receita-foco', 'receita'),
  ('Outras receitas', 'receita-outros', 'receita'),
  ('Pessoal', 'despesa-pessoal', 'despesa'),
  ('Ferramentas', 'despesa-ferramentas', 'despesa'),
  ('Escritório', 'despesa-escritorio', 'despesa'),
  ('Marketing', 'despesa-marketing', 'despesa'),
  ('Viagem', 'despesa-viagem', 'despesa'),
  ('Terceiros', 'despesa-terceiros', 'despesa'),
  ('Outras despesas', 'despesa-outros', 'despesa'),
  ('DAS', 'imposto-das', 'imposto'),
  ('ISS', 'imposto-iss', 'imposto'),
  ('IRPJ', 'imposto-irpj', 'imposto'),
  ('CSLL', 'imposto-csll', 'imposto'),
  ('PIS', 'imposto-pis', 'imposto'),
  ('COFINS', 'imposto-cofins', 'imposto'),
  ('INSS', 'imposto-inss', 'imposto'),
  ('Despesa dedutível', 'deducao-despesa', 'deducao'),
  ('Crédito tributário', 'deducao-credito', 'deducao'),
  ('Isenção', 'deducao-isencao', 'deducao')
) AS v(name, slug, kind)
WHERE o.is_internal = true
ON CONFLICT (org_id, slug) DO NOTHING;

-- ─── RLS: só staff com métricas/financeiro ───────────────────────────────────

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.finance_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.finance_taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_taxes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.finance_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_deductions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_accounts_select ON public.finance_accounts;
DROP POLICY IF EXISTS finance_accounts_insert ON public.finance_accounts;
DROP POLICY IF EXISTS finance_accounts_update ON public.finance_accounts;
DROP POLICY IF EXISTS finance_accounts_delete ON public.finance_accounts;
CREATE POLICY finance_accounts_select ON public.finance_accounts
  FOR SELECT USING (public.staff_can('metricas'));
CREATE POLICY finance_accounts_insert ON public.finance_accounts
  FOR INSERT WITH CHECK (public.staff_can('metricas'));
CREATE POLICY finance_accounts_update ON public.finance_accounts
  FOR UPDATE USING (public.staff_can('metricas'))
  WITH CHECK (public.staff_can('metricas'));
CREATE POLICY finance_accounts_delete ON public.finance_accounts
  FOR DELETE USING (public.staff_can('metricas'));

DROP POLICY IF EXISTS finance_categories_select ON public.finance_categories;
DROP POLICY IF EXISTS finance_categories_insert ON public.finance_categories;
DROP POLICY IF EXISTS finance_categories_update ON public.finance_categories;
DROP POLICY IF EXISTS finance_categories_delete ON public.finance_categories;
CREATE POLICY finance_categories_select ON public.finance_categories
  FOR SELECT USING (public.staff_can('metricas'));
CREATE POLICY finance_categories_insert ON public.finance_categories
  FOR INSERT WITH CHECK (public.staff_can('metricas'));
CREATE POLICY finance_categories_update ON public.finance_categories
  FOR UPDATE USING (public.staff_can('metricas'))
  WITH CHECK (public.staff_can('metricas'));
CREATE POLICY finance_categories_delete ON public.finance_categories
  FOR DELETE USING (public.staff_can('metricas') AND is_system = false);

DROP POLICY IF EXISTS finance_entries_select ON public.finance_entries;
DROP POLICY IF EXISTS finance_entries_insert ON public.finance_entries;
DROP POLICY IF EXISTS finance_entries_update ON public.finance_entries;
DROP POLICY IF EXISTS finance_entries_delete ON public.finance_entries;
CREATE POLICY finance_entries_select ON public.finance_entries
  FOR SELECT USING (public.staff_can('metricas'));
CREATE POLICY finance_entries_insert ON public.finance_entries
  FOR INSERT WITH CHECK (public.staff_can('metricas'));
CREATE POLICY finance_entries_update ON public.finance_entries
  FOR UPDATE USING (public.staff_can('metricas'))
  WITH CHECK (public.staff_can('metricas'));
CREATE POLICY finance_entries_delete ON public.finance_entries
  FOR DELETE USING (public.staff_can('metricas'));

DROP POLICY IF EXISTS finance_invoices_select ON public.finance_invoices;
DROP POLICY IF EXISTS finance_invoices_insert ON public.finance_invoices;
DROP POLICY IF EXISTS finance_invoices_update ON public.finance_invoices;
DROP POLICY IF EXISTS finance_invoices_delete ON public.finance_invoices;
CREATE POLICY finance_invoices_select ON public.finance_invoices
  FOR SELECT USING (public.staff_can('metricas'));
CREATE POLICY finance_invoices_insert ON public.finance_invoices
  FOR INSERT WITH CHECK (public.staff_can('metricas'));
CREATE POLICY finance_invoices_update ON public.finance_invoices
  FOR UPDATE USING (public.staff_can('metricas'))
  WITH CHECK (public.staff_can('metricas'));
CREATE POLICY finance_invoices_delete ON public.finance_invoices
  FOR DELETE USING (public.staff_can('metricas'));

DROP POLICY IF EXISTS finance_taxes_select ON public.finance_taxes;
DROP POLICY IF EXISTS finance_taxes_insert ON public.finance_taxes;
DROP POLICY IF EXISTS finance_taxes_update ON public.finance_taxes;
DROP POLICY IF EXISTS finance_taxes_delete ON public.finance_taxes;
CREATE POLICY finance_taxes_select ON public.finance_taxes
  FOR SELECT USING (public.staff_can('metricas'));
CREATE POLICY finance_taxes_insert ON public.finance_taxes
  FOR INSERT WITH CHECK (public.staff_can('metricas'));
CREATE POLICY finance_taxes_update ON public.finance_taxes
  FOR UPDATE USING (public.staff_can('metricas'))
  WITH CHECK (public.staff_can('metricas'));
CREATE POLICY finance_taxes_delete ON public.finance_taxes
  FOR DELETE USING (public.staff_can('metricas'));

DROP POLICY IF EXISTS finance_deductions_select ON public.finance_deductions;
DROP POLICY IF EXISTS finance_deductions_insert ON public.finance_deductions;
DROP POLICY IF EXISTS finance_deductions_update ON public.finance_deductions;
DROP POLICY IF EXISTS finance_deductions_delete ON public.finance_deductions;
CREATE POLICY finance_deductions_select ON public.finance_deductions
  FOR SELECT USING (public.staff_can('metricas'));
CREATE POLICY finance_deductions_insert ON public.finance_deductions
  FOR INSERT WITH CHECK (public.staff_can('metricas'));
CREATE POLICY finance_deductions_update ON public.finance_deductions
  FOR UPDATE USING (public.staff_can('metricas'))
  WITH CHECK (public.staff_can('metricas'));
CREATE POLICY finance_deductions_delete ON public.finance_deductions
  FOR DELETE USING (public.staff_can('metricas'));
