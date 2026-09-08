-- =============================================================================
-- Seed de dados de teste para e2e (Story 1.8)
-- =============================================================================
-- Cria uma organização + cliente de teste e vincula um usuário JÁ EXISTENTE
-- (criado à mão pela Nayara — ver docs/testing/e2e-setup.md) como client_owner
-- dessa organização.
--
-- Este script NÃO cria o usuário — só usa `auth.users` pra achar o UUID pelo
-- e-mail, exatamente pra evitar precisar digitar/colar um UUID ou senha aqui.
--
-- Uso:
--   1. Edite os dois valores abaixo (v_test_email, v_test_org_slug) pra
--      bater com o usuário e o slug que você quer usar.
--   2. Cole e rode este arquivo inteiro no Supabase Dashboard → SQL Editor
--      (ou via `psql "$DATABASE_URL" -f db/seed-test-data.sql`).
--   3. Idempotente — pode rodar de novo sem duplicar nada.
-- =============================================================================

DO $$
DECLARE
  -- ↓↓↓ EDITE AQUI ↓↓↓
  v_test_email    text := 'e2e-test@landgrow.com.br';
  v_test_org_slug text := 'e2e-test';
  -- ↑↑↑ EDITE AQUI ↑↑↑

  v_user_id    uuid;
  v_org_id     uuid;
BEGIN
  -- Acha o usuário pelo e-mail (precisa já existir — ver docs/testing/e2e-setup.md)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_test_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'Usuário com e-mail % não encontrado em auth.users. Crie o usuário primeiro (ver docs/testing/e2e-setup.md) antes de rodar este seed.',
      v_test_email;
  END IF;

  -- Organização de teste (idempotente)
  INSERT INTO public.organizations (slug, name, plan)
  VALUES (v_test_org_slug, 'Empresa Teste E2E', 'trial')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_org_id;

  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations WHERE slug = v_test_org_slug;
  END IF;

  -- Cliente 1:1 com a org (idempotente)
  -- Colunas reais de public.clientes (db/migrations/0005_collections_schema.sql):
  -- não existe "nome" nem "faturamento_mensal_faixa" nessa tabela — o nome do
  -- cliente vive em public.organizations.name, e a faixa de faturamento é
  -- "faturamento_faixa".
  INSERT INTO public.clientes (org_id, setor, porte, faturamento_faixa)
  VALUES (v_org_id, 'Serviços', 'pequena', '100k-500k')
  ON CONFLICT (org_id) DO NOTHING;

  -- Membership como client_owner (idempotente)
  INSERT INTO public.memberships (user_id, org_id, role)
  VALUES (v_user_id, v_org_id, 'client_owner')
  ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role;

  RAISE NOTICE 'Seed de teste OK — user_id=%, org_id=%, org_slug=%', v_user_id, v_org_id, v_test_org_slug;
END $$;
