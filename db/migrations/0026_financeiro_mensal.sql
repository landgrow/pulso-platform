-- =============================================================================
-- Migration 0026 — Controle mensal (fee / projeto / edital + imposto da nota)
-- =============================================================================
-- Cada linha do mês guarda origem, valor, data e o imposto marcado na nota.
-- O balanço do mês é: entradas − impostos das notas − saídas.
-- =============================================================================

ALTER TABLE public.finance_entries
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'outros';

ALTER TABLE public.finance_entries
  DROP CONSTRAINT IF EXISTS finance_entries_origin_check;

ALTER TABLE public.finance_entries
  ADD CONSTRAINT finance_entries_origin_check
  CHECK (origin IN ('fee_mensal', 'projeto', 'edital', 'outros', 'despesa'));

ALTER TABLE public.finance_entries
  ADD COLUMN IF NOT EXISTS tax_rate numeric(7,4) NOT NULL DEFAULT 0
    CHECK (tax_rate >= 0);

ALTER TABLE public.finance_entries
  ADD COLUMN IF NOT EXISTS tax_amount numeric(14,2) NOT NULL DEFAULT 0
    CHECK (tax_amount >= 0);

ALTER TABLE public.finance_entries
  ADD COLUMN IF NOT EXISTS invoice_ref text;

COMMENT ON COLUMN public.finance_entries.origin IS
  'Origem da linha: fee mensal, projeto, edital, outros (entrada) ou despesa (saída).';

COMMENT ON COLUMN public.finance_entries.tax_amount IS
  'Imposto marcado sobre a nota desta entrada. Zero nas saídas.';

UPDATE public.finance_entries
SET origin = 'despesa'
WHERE kind = 'saida' AND origin = 'outros';
