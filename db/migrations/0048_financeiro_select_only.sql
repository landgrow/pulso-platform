-- =============================================================================
-- Migration 0048 — Livro-caixa só com a chave Financeiro
-- =============================================================================
-- 0028 deixou SELECT compartilhado com Métricas. Quem via funil de CRM
-- também lia contas, lançamentos e impostos. Escritas de contas/categorias/
-- notas ainda estavam em staff_can('metricas') desde 0025.
-- A partir daqui, leitura e escrita do livro exigem a chave Financeiro.
-- Não copia métricas → financeiro: a admin desmarca em Equipe.
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
      'CREATE POLICY %I ON public.%I FOR SELECT USING (public.staff_can(''financeiro''))',
      t || '_select',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.staff_can(''financeiro''))',
      t || '_insert',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (public.staff_can(''financeiro'')) WITH CHECK (public.staff_can(''financeiro''))',
      t || '_update',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
    IF t = 'finance_categories' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE USING (public.staff_can(''financeiro'') AND is_system = false)',
        t || '_delete',
        t
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE USING (public.staff_can(''financeiro''))',
        t || '_delete',
        t
      );
    END IF;
  END LOOP;
END $$;
