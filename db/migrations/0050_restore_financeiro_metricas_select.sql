-- =============================================================================
-- Migration 0050 — Volta o SELECT compartilhado Métricas + Financeiro
-- =============================================================================
-- Reverte 0048/0049 no SELECT. O app de produção (4mkgr) lê o livro
-- também pela chave Métricas no painel. Escritas continuam em financeiro.
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
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (public.staff_can(''financeiro'') OR public.staff_can(''metricas''))',
      t || '_select',
      t
    );
  END LOOP;

  IF to_regclass('public.finance_fixed_costs') IS NOT NULL THEN
    DROP POLICY IF EXISTS finance_fixed_costs_select ON public.finance_fixed_costs;
    CREATE POLICY finance_fixed_costs_select ON public.finance_fixed_costs
      FOR SELECT USING (public.staff_can('financeiro') OR public.staff_can('metricas'));
  END IF;

  IF to_regclass('public.finance_inbox_ignore') IS NOT NULL THEN
    DROP POLICY IF EXISTS finance_inbox_ignore_select ON public.finance_inbox_ignore;
    CREATE POLICY finance_inbox_ignore_select ON public.finance_inbox_ignore
      FOR SELECT USING (public.staff_can('financeiro') OR public.staff_can('metricas'));
  END IF;
END $$;
