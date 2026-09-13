-- =============================================================================
-- Migration 0017 — Filtros, ordenação, agrupamento e cores do kanban
-- =============================================================================
-- Mesmo bloco de recursos do protótipo (kanban.html): filtrar tarefas,
-- ordenar por critérios em cascata, agrupar o quadro por outro campo além de
-- Status, e colorir cards automaticamente por valor de propriedade. Tudo
-- guardado num único jsonb por board — não é dado de card, é preferência de
-- visualização do quadro.
-- =============================================================================

ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS view_config jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.boards.view_config IS
  'Preferências de visualização do board — shape: { filters: FilterCondition[], sort: SortRule[], groupBy: string, colorRules: ColorRule[] }. Ausente = sem filtro, sem ordenação extra, agrupado por status, sem cor automática.';
