-- =============================================================================
-- Migration 0027 — Lugares liberáveis na Equipe (Financeiro separado)
-- =============================================================================
-- O CHECK antigo não tinha `financeiro`. Quem já tinha Métricas ganha
-- Financeiro também, para não perder a aba nova.
-- =============================================================================

ALTER TABLE public.consultant_capabilities
  DROP CONSTRAINT IF EXISTS consultant_capabilities_capability_check;

ALTER TABLE public.consultant_capabilities
  ADD CONSTRAINT consultant_capabilities_capability_check
  CHECK (capability IN (
    'painel',
    'atividades',
    'mapa_mental',
    'crm',
    'clientes',
    'bin',
    'min',
    'financeiro',
    'metricas',
    'acessos',
    'equipe',
    'audit_log'
  ));

INSERT INTO public.consultant_capabilities (consultant_id, capability)
SELECT consultant_id, 'financeiro'
FROM public.consultant_capabilities
WHERE capability = 'metricas'
ON CONFLICT DO NOTHING;
