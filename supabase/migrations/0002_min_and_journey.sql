-- PULSO — MIN (Modelo Integrado de Negócio) + jornada de contrato do cliente
-- Ver PULSO/ROTEIRO-SISTEMATIZACAO-LAND-GROW.md (seção "O caminho recomendado para o PULSO")
-- Tasks: squads/pulso-platform/tasks/setup-min-and-journey-schema.md

-- ============================================================
-- min_blocos
-- Os 13 blocos do MIN, em 3 fases (Fundação/Operação/Consolidação).
-- Um registro por bloco por cliente — atualizado a cada sessão.
-- ============================================================
create type min_fase as enum ('fundacao', 'operacao', 'consolidacao');

create type min_bloco_nome as enum (
  -- Fase 1 — Fundação (Blocos 1-6)
  'proposta_de_valor', 'segmentos_de_clientes', 'atividades_chave',
  'modelo_de_receita', 'comportamento_do_consumidor', 'jornada_do_cliente',
  -- Fase 2 — Operação (Blocos 7-9)
  'canais_de_engajamento', 'recursos_estrategicos', 'estrutura_de_custos',
  -- Fase 3 — Consolidação (Blocos 10-13)
  'ecossistema_de_parceiros', 'metricas_de_impacto', 'cultura_e_valores', 'gestao_de_riscos'
);

create type min_maturidade as enum ('inexistente', 'rascunho', 'funcional', 'otimizado');

create table if not exists min_blocos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  fase min_fase not null,
  bloco min_bloco_nome not null,
  conteudo jsonb not null default '{}'::jsonb, -- texto completo + canvas, formato livre por bloco
  maturidade min_maturidade not null default 'inexistente',
  sessao_data timestamptz, -- data da sessão gravada (Fireflies/Otter) que gerou este bloco
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, bloco)
);

create index if not exists idx_min_blocos_cliente on min_blocos(cliente_id);

drop trigger if exists trg_min_blocos_updated_at on min_blocos;
create trigger trg_min_blocos_updated_at
  before update on min_blocos
  for each row execute function set_updated_at();

-- ============================================================
-- contratos
-- A jornada real do cliente: BIN (avulso) -> Aceleração Fase 1 (receita,
-- 6 meses) -> Aceleração Fase 2 (governança, 6 meses) -> proposta de
-- continuidade (fee reduzido + equity, casos excepcionais) -> Fundo.
-- Cada fase é um contrato distinto — não um registro contínuo.
-- ============================================================
create type contrato_tipo as enum (
  'diagnostico_bin', 'aceleracao_fase1_receita', 'aceleracao_fase2_governanca',
  'proposta_continuidade_fee_equity', 'fundo'
);
create type contrato_status as enum (
  'ativo', 'concluido', 'proposta_pendente', 'aceito', 'recusado', 'cancelado'
);

create table if not exists contratos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo contrato_tipo not null,
  status contrato_status not null default 'ativo',
  data_inicio date,
  data_fim date,
  fee_mensal numeric(12,2),
  equity_percentual numeric(5,2), -- só preenchido no tipo proposta_continuidade_fee_equity
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contratos_cliente on contratos(cliente_id);

drop trigger if exists trg_contratos_updated_at on contratos;
create trigger trg_contratos_updated_at
  before update on contratos
  for each row execute function set_updated_at();

-- ============================================================
-- view: sinal_qualificacao_fundo
-- NÃO decide a proposta de equity — só agrega o sinal que embasa a
-- decisão pontual da Nayara: reconciliação limpa (poucas inconsistências
-- críticas em aberto) + maturidade de governança do MIN (bloco
-- cultura_e_valores e gestao_de_riscos) + contrato Fase 2 concluído.
-- ============================================================
create or replace view sinal_qualificacao_fundo as
select
  c.id as cliente_id,
  c.nome as cliente_nome,
  -- contrato Fase 2 concluído é pré-requisito
  exists (
    select 1 from contratos ct
    where ct.cliente_id = c.id
      and ct.tipo = 'aceleracao_fase2_governanca'
      and ct.status = 'concluido'
  ) as fase2_concluida,
  -- maturidade dos 2 blocos de governança do MIN
  (select mb.maturidade from min_blocos mb where mb.cliente_id = c.id and mb.bloco = 'cultura_e_valores') as maturidade_cultura_valores,
  (select mb.maturidade from min_blocos mb where mb.cliente_id = c.id and mb.bloco = 'gestao_de_riscos') as maturidade_gestao_riscos,
  -- inconsistências críticas ainda não resolvidas no período mais recente
  (
    select count(*)
    from periodos_dados pd, jsonb_array_elements(pd.data -> 'inconsistencias') as inc
    where pd.cliente_id = c.id
      and inc ->> 'severidade' = 'critica'
      and pd.id = (
        select id from periodos_dados pd2
        where pd2.cliente_id = c.id
        order by ano desc, mes desc
        limit 1
      )
  ) as inconsistencias_criticas_periodo_mais_recente
from clientes c;

comment on view sinal_qualificacao_fundo is
  'Sinal de apoio à decisão da Nayara sobre propor fee reduzido + equity. '
  'Não é uma régua automática de qualificação — é insumo pra decisão pontual, caso a caso.';
