-- PULSO — Story 0.6: LGPD
-- Adiciona campos de consentimento à tabela profiles.

-- ─── Consentimento ───────────────────────────────────────────────────────────────

alter table profiles
  add column if not exists consent_version text,
  add column if not exists consent_timestamp timestamptz;

comment on column profiles.consent_version is
  'Versão da política/termos aceita. Ex: "v1.0-2026-09-05"';
comment on column profiles.consent_timestamp is
  'Timestamp em que o usuário aceitou a política de privacidade e termos de uso';

-- ─── Seed consentimento em profiles existentes ────────────────────────────────────
-- Apenas para profiles que já existem (não novos — trigger handle_new_user
-- não insere esses campos, ficam NULL o que está correto).

-- UPDATE profiles
--   SET consent_version = 'v1.0-2026-09-05',
--       consent_timestamp = updated_at
--   WHERE consent_version IS NULL;

-- ─── Index para audit log query ────────────────────────────────────────────────
create index if not exists idx_audit_log_created_at
  on audit_log (created_at desc);

create index if not exists idx_audit_log_org_action
  on audit_log (org_id, action, created_at desc);
