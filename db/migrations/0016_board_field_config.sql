-- =============================================================================
-- Migration 0016 — Campos fixos entram na mesma lista de propriedades
-- =============================================================================
-- No protótipo (kanban.html, state.properties), os campos fixos (Título,
-- Status, Prioridade, Responsável, Setor, Prazo, Cliente) vivem na MESMA
-- lista arrastável/ocultável das propriedades personalizadas — só não têm
-- botão de excluir. `field_config` guarda a posição e visibilidade desses
-- campos fixos por board (propriedades personalizadas continuam usando
-- position/visible de board_properties, já existentes desde 0014).
-- =============================================================================

ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS field_config jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.boards.field_config IS
  'Posição e visibilidade dos campos fixos do card (título/status/prioridade/responsável/setor/prazo/cliente) — shape: { [fieldKey]: { position: number, visible: boolean } }. Ausente = posição padrão, visível.';
