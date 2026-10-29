-- =============================================================================
-- Migration 0049 — Custos fixos e inbox do caixa só com Financeiro
-- =============================================================================
-- Tabelas criadas em 0046/0047 ainda tinham SELECT/ALL com
-- staff_can('metricas') OR staff_can('financeiro'). Fecha o vazamento.
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.finance_fixed_costs') IS NOT NULL THEN
    DROP POLICY IF EXISTS finance_fixed_costs_select ON public.finance_fixed_costs;
    DROP POLICY IF EXISTS finance_fixed_costs_write ON public.finance_fixed_costs;
    CREATE POLICY finance_fixed_costs_select ON public.finance_fixed_costs
      FOR SELECT USING (public.staff_can('financeiro'));
    CREATE POLICY finance_fixed_costs_write ON public.finance_fixed_costs
      FOR ALL USING (public.staff_can('financeiro'))
      WITH CHECK (public.staff_can('financeiro'));
  END IF;

  IF to_regclass('public.finance_inbox_ignore') IS NOT NULL THEN
    DROP POLICY IF EXISTS finance_inbox_ignore_select ON public.finance_inbox_ignore;
    DROP POLICY IF EXISTS finance_inbox_ignore_write ON public.finance_inbox_ignore;
    CREATE POLICY finance_inbox_ignore_select ON public.finance_inbox_ignore
      FOR SELECT USING (public.staff_can('financeiro'));
    CREATE POLICY finance_inbox_ignore_write ON public.finance_inbox_ignore
      FOR ALL USING (public.staff_can('financeiro'))
      WITH CHECK (public.staff_can('financeiro'));
  END IF;
END $$;
