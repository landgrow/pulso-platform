-- ============================================================
-- PULSO — Seed de dados iniciais (desenvolvimento local)
-- Executado APÓS todas as migrations
-- ============================================================

-- 1. Clientes de exemplo
INSERT INTO clientes (id, nome, setor, porte, faturamento_mensal_faixa, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'TechFlow Soluções S.A.', 'Tecnologia', 'Pequena', 'R$100k-R$500k', now()),
  ('22222222-2222-2222-2222-222222222222', 'RS Company', 'Software Tributário', 'Pequena', 'R$50k-R$100k', now()),
  ('33333333-3333-3333-3333-333333333333', 'JS Construtora', 'Engenharia Civil', 'Média', 'R$500k-R$1M', now())
ON CONFLICT DO NOTHING;

-- 2. Aplicar as migrations do motor de coleções (já criam o seed_plano_de_acao)
-- As migrations são carregadas pelo Docker via volume mount:
-- ./supabase/db/migrations:/docker-entrypoint-initdb.d/migrations:ro
-- O script abaixo é executado NA ORDEM dos arquivos:
-- 0001_init_schema.sql
-- 0002_min_and_journey.sql
-- 0003_collections_engine.sql

-- Para forçar execução das migrations em dev local (caso o volume não funcione):
-- Execute manualmente via: docker compose exec postgres psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/migrations/0001_init_schema.sql
-- docker compose exec postgres psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/migrations/0002_min_and_journey.sql
-- docker compose exec postgres psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/migrations/0003_collections_engine.sql

-- 3. tarefas de exemplo para JS Construtora (Jefferson)
-- IDs gerados para os registros da coleção tasks
DO $$
declare
  v_col_id uuid;
  v_prop_atividade uuid;
  v_prop_status uuid;
  v_prop_prioridade uuid;
  v_prop_responsavel uuid;
  v_prop_prazo uuid;
  v_prop_setor uuid;
begin
  -- Buscar coleção tasks da JS Construtora
  select id into v_col_id from collections
  where cliente_id = '33333333-3333-3333-3333-333333333333'
    and system_key = 'tasks'
  limit 1;

  if v_col_id is null then
    raise notice 'Coleção tasks não encontrada para JS Construtora';
    return;
  end if;

  -- Buscar IDs das propriedades
  select id into v_prop_atividade from properties
  where collection_id = v_col_id and name = 'Atividade' and is_primary = true
  limit 1;

  select id into v_prop_status from properties
  where collection_id = v_col_id and type = 'status'
  limit 1;

  select id into v_prop_prioridade from properties
  where collection_id = v_col_id and name = 'Prioridade'
  limit 1;

  select id into v_prop_responsavel from properties
  where collection_id = v_col_id and name = 'Responsável'
  limit 1;

  select id into v_prop_prazo from properties
  where collection_id = v_col_id and name = 'Prazo'
  limit 1;

  select id into v_prop_setor from properties
  where collection_id = v_col_id and name = 'Setor'
  limit 1;

  -- Buscar IDs das opções de status
  declare
    v_status_a_fazer uuid;
    v_status_andamento uuid;
    v_status_concluido uuid;
  begin
    select id into v_status_a_fazer from select_options
    where property_id = v_prop_status and label = 'A Fazer'
    limit 1;

    select id into v_status_andamento from select_options
    where property_id = v_prop_status and label = 'Em Andamento'
    limit 1;

    select id into v_status_concluido from select_options
    where property_id = v_prop_status and label = 'Concluído'
    limit 1;

    -- Buscar opções de prioridade
    declare
      v_prioridade_alta uuid;
      v_prioridade_media uuid;
    begin
      select id into v_prioridade_alta from select_options
      where property_id = v_prop_prioridade and label like '%Alta%'
      limit 1;

      select id into v_prioridade_media from select_options
      where property_id = v_prop_prioridade and label like '%Média%'
      limit 1;

      -- Buscar opções de responsável
      declare
        v_resp_nayara uuid;
        v_resp_candido uuid;
        v_resp_cliente uuid;
      begin
        select id into v_resp_nayara from select_options
        where property_id = v_prop_responsavel and label = 'NAYARA'
        limit 1;

        select id into v_resp_candido from select_options
        where property_id = v_prop_responsavel and label = 'CANDIDO'
        limit 1;

        select id into v_resp_cliente from select_options
        where property_id = v_prop_responsavel and label = 'CLIENTE'
        limit 1;

        -- Inserir tarefas de exemplo
        INSERT INTO records (collection_id, cliente_id, data, position) VALUES
          (v_col_id, '33333333-3333-3333-3333-333333333333',
           jsonb_build_object(
             v_prop_atividade, 'Revisar estrutura de precificação dos projetos de engenharia',
             v_prop_status, v_status_andamento,
             v_prop_prioridade, v_prioridade_alta,
             v_prop_responsavel, jsonb_build_array(v_resp_nayara),
             v_prop_prazo, (now() + interval '7 days')::date,
             v_prop_setor, '["Financeiro"]'::jsonb
           ), 'b') ON CONFLICT DO NOTHING;

        INSERT INTO records (collection_id, cliente_id, data, position) VALUES
          (v_col_id, '33333333-3333-3333-3333-333333333333',
           jsonb_build_object(
             v_prop_atividade, 'Mapear processos de gestão de obras e documentar gargalos',
             v_prop_status, v_status_a_fazer,
             v_prop_prioridade, v_prioridade_alta,
             v_prop_responsavel, jsonb_build_array(v_resp_cliente),
             v_prop_prazo, (now() + interval '14 days')::date,
             v_prop_setor, '["Operacional"]'::jsonb
           ), 'c') ON CONFLICT DO NOTHING;

        INSERT INTO records (collection_id, cliente_id, data, position) VALUES
          (v_col_id, '33333333-3333-3333-3333-333333333333',
           jsonb_build_object(
             v_prop_atividade, 'Definir ICP e proposta de valor para novos clientes B2B',
             v_prop_status, v_status_andamento,
             v_prop_prioridade, v_prioridade_media,
             v_prop_responsavel, jsonb_build_array(v_resp_nayara, v_resp_cliente),
             v_prop_prazo, (now() + interval '21 days')::date,
             v_prop_setor, '["Comercial"]'::jsonb
           ), 'd') ON CONFLICT DO NOTHING;

        INSERT INTO records (collection_id, cliente_id, data, position) VALUES
          (v_col_id, '33333333-3333-3333-3333-333333333333',
           jsonb_build_object(
             v_prop_atividade, 'Implementar controles financeiros: DRE mensal e fluxo de caixa',
             v_prop_status, v_status_concluido,
             v_prop_prioridade, v_prioridade_alta,
             v_prop_responsavel, jsonb_build_array(v_resp_nayara),
             v_prop_prazo, (now() - interval '3 days')::date,
             v_prop_setor, '["Financeiro"]'::jsonb
           ), 'e') ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Seed de tarefas concluido para JS Construtora';
      end;
    end;
  end;
end;
$$;

-- 4. Verbose de confirmação
DO $$
begin
  raise notice '=== PULSO SEED COMPLETO ===';
  raise notice 'Clientes: %', (select count(*) from clientes);
  raise notice 'Colecoes: %', (select count(*) from collections);
  raise notice 'Registros: %', (select count(*) from records);
  raise notice 'Properties: %', (select count(*) from properties);
  raise notice '===========================';
end;
$$;
