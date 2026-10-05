-- =============================================================================
-- Migration 0035 — Reuniões com horário e convite por e-mail
-- =============================================================================
-- Idempotente (pode rodar mais de uma vez). Não apaga nem altera dado existente:
-- só acrescenta colunas opcionais na tabela de reuniões.
--
--   hora_inicio / duracao_min : horário em São Paulo (a reunião já tinha só a data)
--   link                      : link da reunião (Meet, Zoom...), opcional
--   convidados                : [{ "email": "...", "nome": "..." }] — quem recebe o convite
--   convite_enviado_at        : quando o convite saiu da última vez
--   lembrete_enviado_at       : quando o lembrete de 1h antes saiu (evita repetir)
--   ics_sequence              : versão do convite (remarcar/reenviar atualiza a agenda)
-- =============================================================================

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS hora_inicio         time,
  ADD COLUMN IF NOT EXISTS duracao_min         integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS link                text,
  ADD COLUMN IF NOT EXISTS convidados          jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS convite_enviado_at  timestamptz,
  ADD COLUMN IF NOT EXISTS lembrete_enviado_at timestamptz,
  ADD COLUMN IF NOT EXISTS ics_sequence        integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  ALTER TABLE public.meetings
    ADD CONSTRAINT meetings_duracao_min_check CHECK (duracao_min BETWEEN 5 AND 720);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- O job de lembrete busca reuniões de hoje/amanhã que ainda não foram lembradas.
CREATE INDEX IF NOT EXISTS meetings_lembrete_pendente_idx
  ON public.meetings (data)
  WHERE hora_inicio IS NOT NULL AND lembrete_enviado_at IS NULL;
