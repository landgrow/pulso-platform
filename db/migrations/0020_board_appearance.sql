-- =============================================================================
-- Migration 0020 — Ícone e cor do kanban (aba "Layout" das Configurações)
-- =============================================================================
-- No protótipo (kanban.html, state.baseIcon/state.baseColor), cada "base"
-- (kanban) tem um emoji + cor próprios, escolhidos na aba Layout das
-- Configurações e exibidos ao lado do nome — na lista de kanbans e no
-- cabeçalho do quadro aberto. Faltava isso no port: a aba Layout só tinha
-- Propriedades + Colunas, sem o "Ícone da base"/"Cor da capa" do protótipo.
-- =============================================================================

ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '📋';
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#3B82F6';

COMMENT ON COLUMN public.boards.icon IS
  'Emoji exibido ao lado do nome do kanban (lista de kanbans + cabeçalho do quadro) — equivalente a state.baseIcon no protótipo.';
COMMENT ON COLUMN public.boards.color IS
  'Cor de fundo do badge do ícone do kanban — equivalente a state.baseColor no protótipo.';
