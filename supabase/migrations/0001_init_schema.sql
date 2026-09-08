-- PULSO — schema inicial (Camadas 1-3: ingestão, formulário BIN, reconciliação)
-- Ver PULSO/MOTOR-INGESTAO-RECONCILIACAO.md seção 6
-- Task: squads/pulso-platform/tasks/setup-supabase-schema.md

create extension if not exists pgcrypto;

-- ============================================================
-- clientes
-- ============================================================
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  setor text,
  porte text,
  faturamento_mensal_faixa text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- periodos_dados
-- espelha client-data-schema.json (versão 3.0) em jsonb.
-- ============================================================
create table if not exists periodos_dados (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  mes smallint not null check (mes between 1 and 12),
  ano smallint not null check (ano >= 2024),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, mes, ano)
);

create index if not exists idx_periodos_dados_cliente on periodos_dados(cliente_id);
-- consulta rápida de inconsistências críticas sem varrer o jsonb inteiro
create index if not exists idx_periodos_dados_inconsistencias
  on periodos_dados using gin ((data -> 'inconsistencias'));

-- ============================================================
-- conexoes
-- token_encrypted NUNCA guarda texto puro — sempre via pgp_sym_encrypt/decrypt
-- com chave vinda de env var (ENCRYPTION_KEY), nunca hardcoded aqui.
-- ============================================================
create type tipo_conexao as enum ('crm', 'financeiro', 'instagram');
create type status_conexao as enum ('ativa', 'expirada', 'revogada', 'erro');

create table if not exists conexoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo tipo_conexao not null,
  provedor text not null, -- ex.: 'pipedrive', 'pluggy', 'meta'
  token_encrypted bytea not null,
  status status_conexao not null default 'ativa',
  ultima_sincronizacao timestamptz,
  created_at timestamptz not null default now(),
  unique (cliente_id, tipo, provedor)
);

create index if not exists idx_conexoes_cliente on conexoes(cliente_id);

-- ============================================================
-- evidencias
-- arquivos enviados (upload) ou capturados de fonte conectada,
-- usados como evidência real pelo motor de reconciliação.
-- ============================================================
create table if not exists evidencias (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  periodo_id uuid references periodos_dados(id) on delete cascade,
  fonte text not null, -- ex.: 'upload', 'instagram', 'crm', 'financeiro'
  tipo_arquivo text,   -- ex.: 'pdf', 'xlsx', 'csv', 'audio'
  storage_path text not null, -- caminho no Supabase Storage
  created_at timestamptz not null default now()
);

create index if not exists idx_evidencias_cliente on evidencias(cliente_id);
create index if not exists idx_evidencias_periodo on evidencias(periodo_id);

-- ============================================================
-- updated_at automático em periodos_dados
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_periodos_dados_updated_at on periodos_dados;
create trigger trg_periodos_dados_updated_at
  before update on periodos_dados
  for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security
-- Fase inicial: acesso só via service role (backend Vercel Functions).
-- Policies de usuário final (portal do cliente) entram junto com
-- Supabase Auth — fora do escopo desta migração.
-- ============================================================
alter table clientes enable row level security;
alter table periodos_dados enable row level security;
alter table conexoes enable row level security;
alter table evidencias enable row level security;

-- Nenhuma policy de anon/authenticated criada ainda: por padrão,
-- só a service role key (usada pelas Vercel Functions) acessa essas tabelas.
