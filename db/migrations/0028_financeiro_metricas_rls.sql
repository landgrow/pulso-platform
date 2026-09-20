-- =============================================================================
-- Migration 0028 — Métricas e Financeiro leem o mesmo livro-caixa
-- =============================================================================
-- SELECT: quem tem financeiro OU métricas. Escrita: só financeiro.
-- =============================================================================

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
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      t || '_select',
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (
         public.staff_can(''financeiro'') OR public.staff_can(''metricas'')
       )',
      t || '_select',
      t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS finance_entries_insert ON public.finance_entries;
DROP POLICY IF EXISTS finance_entries_update ON public.finance_entries;
DROP POLICY IF EXISTS finance_entries_delete ON public.finance_entries;
CREATE POLICY finance_entries_insert ON public.finance_entries
  FOR INSERT WITH CHECK (public.staff_can('financeiro'));
CREATE POLICY finance_entries_update ON public.finance_entries
  FOR UPDATE USING (public.staff_can('financeiro'))
  WITH CHECK (public.staff_can('financeiro'));
CREATE POLICY finance_entries_delete ON public.finance_entries
  FOR DELETE USING (public.staff_can('financeiro'));
