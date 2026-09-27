-- =============================================================================
-- Migration 0031 — Livro financeiro no PULSO do cliente
-- =============================================================================
-- Staff continua vendo/escrevendo o livro da casa.
-- Membro da empresa lê o livro da própria org; owner/member também escreve.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_write_org_finance(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF public.staff_can('financeiro') THEN
    RETURN true;
  END IF;
  IF NOT public.is_member_of(org_id) THEN
    RETURN false;
  END IF;
  v_role := public.member_role(org_id);
  RETURN v_role IN ('client_owner', 'client_member');
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'finance_accounts',
    'finance_categories',
    'finance_entries',
    'finance_invoices',
    'finance_taxes',
    'finance_deductions'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (
         public.staff_can(''financeiro'')
         OR public.staff_can(''metricas'')
         OR public.is_member_of(org_id)
       )',
      t || '_select',
      t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS finance_accounts_insert ON public.finance_accounts;
DROP POLICY IF EXISTS finance_accounts_update ON public.finance_accounts;
DROP POLICY IF EXISTS finance_accounts_delete ON public.finance_accounts;
CREATE POLICY finance_accounts_insert ON public.finance_accounts
  FOR INSERT WITH CHECK (public.can_write_org_finance(org_id));
CREATE POLICY finance_accounts_update ON public.finance_accounts
  FOR UPDATE USING (public.can_write_org_finance(org_id))
  WITH CHECK (public.can_write_org_finance(org_id));
CREATE POLICY finance_accounts_delete ON public.finance_accounts
  FOR DELETE USING (public.can_write_org_finance(org_id));

DROP POLICY IF EXISTS finance_categories_insert ON public.finance_categories;
DROP POLICY IF EXISTS finance_categories_update ON public.finance_categories;
DROP POLICY IF EXISTS finance_categories_delete ON public.finance_categories;
CREATE POLICY finance_categories_insert ON public.finance_categories
  FOR INSERT WITH CHECK (public.can_write_org_finance(org_id));
CREATE POLICY finance_categories_update ON public.finance_categories
  FOR UPDATE USING (public.can_write_org_finance(org_id))
  WITH CHECK (public.can_write_org_finance(org_id));
CREATE POLICY finance_categories_delete ON public.finance_categories
  FOR DELETE USING (public.can_write_org_finance(org_id) AND is_system = false);

DROP POLICY IF EXISTS finance_entries_insert ON public.finance_entries;
DROP POLICY IF EXISTS finance_entries_update ON public.finance_entries;
DROP POLICY IF EXISTS finance_entries_delete ON public.finance_entries;
CREATE POLICY finance_entries_insert ON public.finance_entries
  FOR INSERT WITH CHECK (public.can_write_org_finance(org_id));
CREATE POLICY finance_entries_update ON public.finance_entries
  FOR UPDATE USING (public.can_write_org_finance(org_id))
  WITH CHECK (public.can_write_org_finance(org_id));
CREATE POLICY finance_entries_delete ON public.finance_entries
  FOR DELETE USING (public.can_write_org_finance(org_id));

DROP POLICY IF EXISTS finance_invoices_insert ON public.finance_invoices;
DROP POLICY IF EXISTS finance_invoices_update ON public.finance_invoices;
DROP POLICY IF EXISTS finance_invoices_delete ON public.finance_invoices;
CREATE POLICY finance_invoices_insert ON public.finance_invoices
  FOR INSERT WITH CHECK (public.can_write_org_finance(org_id));
CREATE POLICY finance_invoices_update ON public.finance_invoices
  FOR UPDATE USING (public.can_write_org_finance(org_id))
  WITH CHECK (public.can_write_org_finance(org_id));
CREATE POLICY finance_invoices_delete ON public.finance_invoices
  FOR DELETE USING (public.can_write_org_finance(org_id));

DROP POLICY IF EXISTS finance_taxes_insert ON public.finance_taxes;
DROP POLICY IF EXISTS finance_taxes_update ON public.finance_taxes;
DROP POLICY IF EXISTS finance_taxes_delete ON public.finance_taxes;
CREATE POLICY finance_taxes_insert ON public.finance_taxes
  FOR INSERT WITH CHECK (public.can_write_org_finance(org_id));
CREATE POLICY finance_taxes_update ON public.finance_taxes
  FOR UPDATE USING (public.can_write_org_finance(org_id))
  WITH CHECK (public.can_write_org_finance(org_id));
CREATE POLICY finance_taxes_delete ON public.finance_taxes
  FOR DELETE USING (public.can_write_org_finance(org_id));

DROP POLICY IF EXISTS finance_deductions_insert ON public.finance_deductions;
DROP POLICY IF EXISTS finance_deductions_update ON public.finance_deductions;
DROP POLICY IF EXISTS finance_deductions_delete ON public.finance_deductions;
CREATE POLICY finance_deductions_insert ON public.finance_deductions
  FOR INSERT WITH CHECK (public.can_write_org_finance(org_id));
CREATE POLICY finance_deductions_update ON public.finance_deductions
  FOR UPDATE USING (public.can_write_org_finance(org_id))
  WITH CHECK (public.can_write_org_finance(org_id));
CREATE POLICY finance_deductions_delete ON public.finance_deductions
  FOR DELETE USING (public.can_write_org_finance(org_id));
