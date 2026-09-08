-- PULSO — Motor de Coleções (Notion-like) + Seed: Plano de Ação
-- Schema: workspaces → collections → properties/select_options → records/views
-- Ref: SYSTEM-PROMPT-PULSO-MVP.md §5.2 + PROMPT-GOOGLE-AI-STUDIO.md §6

-- ============================================================
-- HELPERS
-- ============================================================

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Fractional indexing: calcula a próxima posição entre dois valores existentes
-- Uso: ao inserir entre 'a' e 'b', retorna (ascii(a)+ascii(b))/2
-- Para uuid: substring(hex(a)||hex(b), 1, length(hex(a)))
create or replace function next_position(before_val text, after_val text)
returns text as $$
declare
  before_bytes bytea;
  after_bytes bytea;
  result text;
begin
  before_bytes = encode(decode(replace(before_val, '-', ''), 'hex'), 'base64');
  after_bytes  = encode(decode(replace(after_val,  '-', ''), 'hex'), 'base64');
  -- posição intermediária simples (pode ser refinada com pg 128 se necessário)
  result = before_val || '.mid' || left(after_val, 8);
  return result;
end;
$$ language plpgsql;

-- ============================================================
-- WORKSPACES
-- Agrupador dentro da organização (ex.: "Diagnóstico", "Aceleração", "Operação")
-- ============================================================
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  name text not null,
  icon text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, name)
);

create index if not exists idx_workspaces_cliente on workspaces(cliente_id);

drop trigger if exists trg_workspaces_updated on workspaces;
create trigger trg_workspaces_updated
  before update on workspaces for each row execute function set_updated_at();

-- ============================================================
-- COLLECTIONS
-- ============================================================
create type collection_system_key as enum ('tasks', 'okrs', 'action_plan', 'stakeholders');

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete set null,
  name text not null,
  icon text,
  description text,
  is_system boolean not null default false,
  system_key collection_system_key,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, name)
);

create index if not exists idx_collections_cliente on collections(cliente_id);
create index if not exists idx_collections_workspace on collections(workspace_id);

drop trigger if exists trg_collections_updated on collections;
create trigger trg_collections_updated
  before update on collections for each row execute function set_updated_at();

-- ============================================================
-- PROPERTIES (colunas / campos)
-- Tipos: text, long_text, number, currency, percent,
--        select, multi_select, status, date, datetime,
--        checkbox, url, email, phone, person, relation, file, rating
-- ============================================================
create type property_type as enum (
  'text', 'long_text', 'number', 'currency', 'percent',
  'select', 'multi_select', 'status', 'date', 'datetime',
  'checkbox', 'url', 'email', 'phone', 'person', 'relation', 'file', 'rating'
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  name text not null,
  type property_type not null,
  config jsonb not null default '{}'::jsonb,
  -- config por tipo:
  --   text/long_text: { placeholder }
  --   number/currency/percent: { precision, prefix, suffix, aggregation }
  --   select/multi_select/status: opções via select_options; status adiciona { groups: {todo:[],doing:[],done:[]} }
  --   date/datetime: { format, includeTime }
  --   person: { multiple }
  --   relation: { targetCollectionId, multiple }
  --   file: { multiple, accept }
  --   rating: { max }
  position int not null default 0,
  is_primary boolean not null default false,
  is_required boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_properties_collection on properties(collection_id);
create index if not exists idx_properties_cliente on properties(cliente_id);

drop trigger if exists trg_properties_updated on properties;
create trigger trg_properties_updated
  before update on properties for each row execute function set_updated_at();

-- ============================================================
-- SELECT_OPTIONS (valores de select / multi_select / status)
-- ============================================================
create table if not exists select_options (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  label text not null,
  color text not null default 'gray',
  position int not null default 0,
  unique (property_id, label)
);

create index if not exists idx_select_options_property on select_options(property_id);

-- ============================================================
-- RECORDS (linhas / registros)
-- data: { "<property_id>": valor }
-- position: ordenação manual (text, ordenação lexicográfica)
-- ============================================================
create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  position text not null default 'z',
  archived boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_records_collection on records(collection_id);
create index if not exists idx_records_cliente on records(cliente_id);
create index if not exists idx_records_position on records(collection_id, position);
create index if not exists idx_records_archived on records(archived);

drop trigger if exists trg_records_updated on records;
create trigger trg_records_updated
  before update on records for each row execute function set_updated_at();

-- ============================================================
-- RECORD_RELATIONS (integridade das propriedades 'relation')
-- ============================================================
create table if not exists record_relations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  from_record_id uuid not null references records(id) on delete cascade,
  to_record_id uuid not null references records(id) on delete cascade,
  unique (property_id, from_record_id, to_record_id)
);

create index if not exists idx_record_relations_from on record_relations(from_record_id);
create index if not exists idx_record_relations_to on record_relations(to_record_id);

-- ============================================================
-- VIEWS (visualizações: tabela, quadro/kanban, lista, galeria, calendário)
-- ============================================================
create type view_type as enum ('table', 'board', 'list', 'gallery', 'calendar');

create table if not exists views (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  name text not null,
  type view_type not null,
  config jsonb not null default '{}'::jsonb,
  -- config: { filters, sorts, visibleProperties, propertyWidths, groupBy,
  --           boardColumnProperty, calendarDateProperty, cardCoverProperty, pageSize }
  position int not null default 0,
  is_default boolean not null default false,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_views_collection on views(collection_id);

-- ============================================================
-- RLS — Row Level Security
-- Padrão: default deny. Policies por tabela abaixo.
-- ============================================================
alter table workspaces enable row level security;
alter table collections enable row level security;
alter table properties enable row level security;
alter table select_options enable row level security;
alter table records enable row level security;
alter table record_relations enable row level security;
alter table views enable row level security;

-- Todas as tabelas são acessíveis a quem tem acesso à organização (cliente).
-- O MVP atual (sem Auth) usa service role key — isso será refinado com Supabase Auth.
-- Por ora: política permissiva para service role (admin do Supabase).
-- Quando Auth for implementado, substituir por:
--   using ( cliente_id in (select cliente_id from memberships where user_id = auth.uid()) )

create policy workspaces_select on workspaces for select using (true);
create policy workspaces_all on workspaces for all using (true);

create policy collections_select on collections for select using (true);
create policy collections_all on collections for all using (true);

create policy properties_select on properties for select using (true);
create policy properties_all on properties for all using (true);

create policy select_options_select on select_options for select using (true);
create policy select_options_all on select_options for all using (true);

create policy records_select on records for select using (true);
create policy records_all on records for all using (true);

create policy record_relations_select on record_relations for select using (true);
create policy record_relations_all on record_relations for all using (true);

create policy views_select on views for select using (true);
create policy views_all on views for all using (true);

-- ============================================================
-- SEED: workspace + coleção + propriedades + views + tarefas de exemplo
-- Para cada cliente existente no banco
-- Executar uma vez por cliente (id do cliente como parâmetro)
-- ============================================================

-- Função de seed do Plano de Ação para um cliente específico
create or replace function seed_plano_de_acao(p_cliente_id uuid)
returns void as $$
declare
  v_workspace_id uuid;
  v_collection_id uuid;
  v_prop_atividade uuid;
  v_prop_status uuid;
  v_prop_prioridade uuid;
  v_prop_responsavel uuid;
  v_prop_setor uuid;
  v_prop_tipo uuid;
  v_prop_prazo uuid;
  v_prop_data uuid;
  v_prop_origem uuid;
  v_prop_observacoes uuid;
  v_prop_url uuid;
  v_view_board_id uuid;
  v_view_table_id uuid;
begin

  -- 1. Workspace "Aceleração"
  insert into workspaces (cliente_id, name, icon, position)
  values (p_cliente_id, 'Aceleração', '🚀', 0)
  returning id into v_workspace_id;

  -- 2. Coleção "Plano de Ação"
  insert into collections (cliente_id, workspace_id, name, icon, is_system, system_key)
  values (p_cliente_id, v_workspace_id, '📌 Plano de Ação', '📌', true, 'tasks')
  returning id into v_collection_id;

  -- 3. Propriedades
  -- Atividade (título primário)
  insert into properties (collection_id, cliente_id, name, type, position, is_primary)
  values (v_collection_id, p_cliente_id, 'Atividade', 'text', 0, true)
  returning id into v_prop_atividade;

  -- Status (sistema de colunas do kanban)
  insert into properties (collection_id, cliente_id, name, type, position, is_required)
  values (v_collection_id, p_cliente_id, 'Status', 'status', 1, true)
  returning id into v_prop_status;

  -- Opções de Status
  insert into select_options (property_id, label, color, position) values
    (v_prop_status, 'Reuniões', 'purple', 0),
    (v_prop_status, 'A Fazer', 'gray', 1),
    (v_prop_status, 'Em Andamento', 'blue', 2),
    (v_prop_status, 'Revisão Interna', 'yellow', 3),
    (v_prop_status, 'Revisão do Cliente', 'orange', 4),
    (v_prop_status, 'Cancelado', 'red', 5),
    (v_prop_status, 'Concluído', 'green', 6);

  -- Atualizar config do status com grupos kanban
  update properties set config = '{
    "groups": {
      "todo": ["A Fazer"],
      "doing": ["Em Andamento", "Revisão Interna"],
      "done": ["Concluído", "Cancelado"]
    }
  }'::jsonb where id = v_prop_status;

  -- Prioridade
  insert into properties (collection_id, cliente_id, name, type, position)
  values (v_collection_id, p_cliente_id, 'Prioridade', 'select', 2, false)
  returning id into v_prop_prioridade;

  insert into select_options (property_id, label, color, position) values
    (v_prop_prioridade, '🔴 Alta', 'red', 0),
    (v_prop_prioridade, '🟡 Média', 'yellow', 1),
    (v_prop_prioridade, '🟢 Baixa', 'green', 2),
    (v_prop_prioridade, 'Reuniões', 'purple', 3);

  -- Responsável
  insert into properties (collection_id, cliente_id, name, type, position, config)
  values (v_collection_id, p_cliente_id, 'Responsável', 'select', 3, '{"multiple": true}'::jsonb)
  returning id into v_prop_responsavel;

  insert into select_options (property_id, label, color, position) values
    (v_prop_responsavel, 'NAYARA', 'green', 0),
    (v_prop_responsavel, 'CANDIDO', 'gray', 1),
    (v_prop_responsavel, 'CLIENTE', 'blue', 2);

  -- Setor
  insert into properties (collection_id, cliente_id, name, type, position, config)
  values (v_collection_id, p_cliente_id, 'Setor', 'multi_select', 4, '{}'::jsonb)
  returning id into v_prop_setor;

  insert into select_options (property_id, label, color, position) values
    (v_prop_setor, 'Comercial', 'blue', 0),
    (v_prop_setor, 'Financeiro', 'green', 1),
    (v_prop_setor, 'Operacional', 'orange', 2),
    (v_prop_setor, 'Pessoas', 'purple', 3),
    (v_prop_setor, 'Marketing', 'pink', 4),
    (v_prop_setor, 'Produto', 'cyan', 5),
    (v_prop_setor, 'Gestão', 'gray', 6),
    (v_prop_setor, 'Jurídico', 'red', 7);

  -- Tipo
  insert into properties (collection_id, cliente_id, name, type, position, config)
  values (v_collection_id, p_cliente_id, 'Tipo', 'multi_select', 5, '{}'::jsonb)
  returning id into v_prop_tipo;

  insert into select_options (property_id, label, color, position) values
    (v_prop_tipo, '👥 Interna', 'gray', 0),
    (v_prop_tipo, '🤝 Cliente', 'blue', 1),
    (v_prop_tipo, '🔄 Review', 'yellow', 2),
    (v_prop_tipo, '🚀 Weekly', 'green', 3),
    (v_prop_tipo, 'Estratégia', 'purple', 4);

  -- Prazo
  insert into properties (collection_id, cliente_id, name, type, position)
  values (v_collection_id, p_cliente_id, 'Prazo', 'date', 6, false)
  returning id into v_prop_prazo;

  -- Data
  insert into properties (collection_id, cliente_id, name, type, position)
  values (v_collection_id, p_cliente_id, 'Data', 'date', 7, false)
  returning id into v_prop_data;

  -- Origem
  insert into properties (collection_id, cliente_id, name, type, position)
  values (v_collection_id, p_cliente_id, 'Origem', 'text', 8, false)
  returning id into v_prop_origem;

  -- Observações
  insert into properties (collection_id, cliente_id, name, type, position)
  values (v_collection_id, p_cliente_id, 'Observações', 'long_text', 9, false)
  returning id into v_prop_observacoes;

  -- URL
  insert into properties (collection_id, cliente_id, name, type, position)
  values (v_collection_id, p_cliente_id, 'URL', 'url', 10, false)
  returning id into v_prop_url;

  -- 4. Views
  -- Quadro (kanban) — default
  insert into views (collection_id, name, type, config, position, is_default)
  values (
    v_collection_id,
    'Quadro',
    'board',
    jsonb_build_object(
      'boardColumnProperty', v_prop_status,
      'visibleProperties', jsonb_build_array(v_prop_atividade, v_prop_responsavel, v_prop_prazo, v_prop_setor, v_prop_prioridade)
    ) || jsonb_build_object(
      'propertyWidths', jsonb_build_object(
        v_prop_responsavel::text, 140,
        v_prop_prazo::text, 110,
        v_prop_setor::text, 130,
        v_prop_prioridade::text, 100
      )
    ),
    0,
    true
  ) returning id into v_view_board_id;

  -- Tabela
  insert into views (collection_id, name, type, config, position, is_default)
  values (
    v_collection_id,
    'Tabela',
    'table',
    jsonb_build_object(
      'visibleProperties', jsonb_build_array(
        v_prop_atividade, v_prop_status, v_prop_prioridade, v_prop_responsavel,
        v_prop_setor, v_prop_tipo, v_prop_prazo
      ),
      'propertyWidths', jsonb_build_object(
        v_prop_atividade::text, 300,
        v_prop_status::text, 150,
        v_prop_prioridade::text, 120,
        v_prop_responsavel::text, 140,
        v_prop_setor::text, 160,
        v_prop_tipo::text, 130,
        v_prop_prazo::text, 110
      )
    ),
    1,
    false
  ) returning id into v_view_table_id;

end;
$$ language plpgsql;

-- Executar seed para os clientes existentes (se ainda não tiverem Plano de Ação)
do $$
declare
  r record;
  has_acao boolean;
begin
  for r in select id from clientes loop
    select exists (
      select 1 from collections c
      where c.cliente_id = r.id and c.system_key = 'tasks'
    ) into has_acao;

    if not has_acao then
      perform seed_plano_de_acao(r.id);
      raise notice 'Seed Plano de Ação executado para cliente: %', r.id;
    else
      raise notice 'Plano de Ação já existe para cliente: %', r.id;
    end if;
  end loop;
end;
$$;

-- ============================================================
-- FUNÇÕES DE COLEÇÃO (para uso futuro via Supabase RPC)
-- ============================================================

-- get_collection_with_related(cliente_id, collection_id)
-- Retorna coleção + propriedades + select_options + views em um único JSON
create or replace function get_collection_with_related(
  p_cliente_id uuid,
  p_collection_id uuid
)
returns jsonb as $$
declare
  result jsonb;
begin
  with collection as (
    select * from collections
    where id = p_collection_id and cliente_id = p_cliente_id
  ),
  properties_data as (
    select p.*,
      coalesce(jsonb_agg(
        so.* order by so.position
      ) filter (where so.id is not null), '[]') as options
    from properties p
    left join select_options so on so.property_id = p.id
    where p.collection_id = p_collection_id
    group by p.id
  ),
  views_data as (
    select * from views
    where collection_id = p_collection_id
    order by position
  ),
  records_data as (
    select * from records
    where collection_id = p_collection_id and not archived
    order by position
  )
  select jsonb_build_object(
    'collection', (select row_to_json(c) from collection c),
    'properties', (select coalesce(jsonb_agg(p.*), '[]') from properties_data p),
    'views', (select coalesce(jsonb_agg(v.*), '[]') from views_data v),
    'records', (select coalesce(jsonb_agg(r.*), '[]') from records_data r)
  ) into result;

  return result;
end;
$$ language plpgsql security definer;
