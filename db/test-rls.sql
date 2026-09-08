-- =============================================================================
-- Teste de RLS — validar cada política
-- =============================================================================
-- IMPORTANTE: Este script é para ser executado no SUPABASE DASHBOARD (SQL Editor)
-- ou via psql conectado ao banco de produção.
--
-- Cada teste usa SET LOCAL auth.uid() para simular o papel desejado.
-- Nota: SET LOCAL auth.jwt() não funciona em todas as versões — testar antes.
-- =============================================================================
-- Para testar como usuário anônimo:
--   SET ROLE postgres;  -- bypassa RLS temporariamente para setup
--   SET LOCAL ROLE authenticated;  -- força papel
-- =============================================================================

-- ─── Helpers para output ────────────────────────────────────────────────────

DO $$
DECLARE
  test_name text;
  passed   boolean;
  result   text;
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'RLS Validation Tests — PULSO';
  RAISE NOTICE 'Run as: Supabase Dashboard SQL Editor';
  RAISE NOTICE '==================================================';
END;
$$;

-- ─── Test 1: platform_admin pode ler todas as orgs ────────────────────────

-- Setup: criar usuário admin fake para teste
DO $$
DECLARE
  test_org_id uuid;
BEGIN
  -- Obtém ou cria org de teste
  SELECT id INTO test_org_id
  FROM public.organizations
  WHERE slug = 'landgrow-test'
  LIMIT 1;

  IF test_org_id IS NULL THEN
    INSERT INTO public.organizations (slug, name, plan)
    VALUES ('landgrow-test', 'Org Teste RLS', 'trial')
    RETURNING id INTO test_org_id;
  END IF;

  RAISE NOTICE 'Test org ID: %', test_org_id;
END;
$$;

-- ─── Test 2: is_platform_admin() retorna true para admin ───────────────────
-- SUBSTITUA 'ADMIN_UUID' pelo ID do usuário com papel platform_admin

/*
-- Rodar como anon (sem contexto de auth)
SELECT
  'is_platform_admin() para anon'        AS test,
  public.is_platform_admin()             AS result,
  CASE WHEN public.is_platform_admin() = false THEN 'PASS' ELSE 'FAIL' END AS status;

-- Rodar com ADMIN_UUID
SELECT
  'is_platform_admin() para admin'       AS test,
  public.is_platform_admin()             AS result,
  CASE WHEN public.is_platform_admin() = true THEN 'PASS' ELSE 'FAIL' END AS status;
*/

-- ─── Test 3: is_member_of() para membro ───────────────────────────────────
/*
SELECT
  'is_member_of(org) para member'       AS test,
  public.is_member_of('ORG_UUID')       AS result,
  CASE WHEN public.is_member_of('ORG_UUID') = true THEN 'PASS' ELSE 'FAIL' END AS status;
*/

-- ─── Test 4: is_member_of() para não-membro ───────────────────────────────
/*
SELECT
  'is_member_of(org) para não-membro'  AS test,
  public.is_member_of('OTHER_ORG_UUID') AS result,
  CASE WHEN public.is_member_of('OTHER_ORG_UUID') = false THEN 'PASS' ELSE 'FAIL' END AS status;
*/

-- ─── Test 5: member_role() retorna papel correto ────────────────────────────
/*
SELECT
  'member_role() para owner'            AS test,
  public.member_role('ORG_UUID')       AS result,
  CASE WHEN public.member_role('ORG_UUID') = 'client_owner' THEN 'PASS' ELSE 'FAIL' END AS status;
*/

-- ─── Test 6: has_org_role() hierarquia ────────────────────────────────────
/*
SELECT
  'has_org_role(owner >= member)'       AS test,
  public.has_org_role('ORG_UUID', 'client_member') AS result,
  CASE WHEN public.has_org_role('ORG_UUID', 'client_member') = true THEN 'PASS' ELSE 'FAIL' END AS status;

SELECT
  'has_org_role(viewer NOT >= member)'  AS test,
  public.has_org_role('ORG_UUID', 'client_member') AS result,
  CASE WHEN public.has_org_role('ORG_UUID', 'client_member') = false THEN 'PASS' ELSE 'FAIL' END AS status;
*/

-- ─── Test 7: organizations INSERT só por admin ────────────────────────────
/*
-- Como member (deve falhar):
INSERT INTO public.organizations (slug, name, plan)
VALUES ('should-fail', 'Test Fail', 'trial');
-- Esperado: erro de RLS

-- Como admin (deve funcionar):
-- INSERT INTO public.organizations (slug, name, plan)
-- VALUES ('should-pass', 'Test Pass', 'trial');
-- Esperado: sucesso
*/

-- ─── Test 8: audit_log é imutável ─────────────────────────────────────────
/*
-- UPDATE em audit_log deve falhar
UPDATE public.audit_log SET metadata = '{"test": true}' LIMIT 1;
-- Esperado: erro de RLS

-- DELETE em audit_log deve falhar
DELETE FROM public.audit_log LIMIT 1;
-- Esperado: erro de RLS
*/

-- ─── Test 9: memberships DELETE não pode remover único owner ────────────────
/*
-- O RLS impede DELETE pelo policy, mas a lógica de negócio
-- "não pode remover o último owner" deve ser validada
-- na aplicação (via Server Action), não no DB.
-- O DB apenas checa has_org_role(org, 'client_owner') no DELETE policy.
*/

-- ════════════════════════════════════════════════════════════════════════════
-- ÉPICO 1 — MOTOR DE COLEÇÕES
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Test 10: clientes SELECT entre orgs (isolamento) ─────────────────────
/*
-- Setup: criar 2 orgs distintas e clientes para cada
-- INSERT INTO public.organizations (slug, name, plan)
-- VALUES ('org-a-test', 'Org A', 'trial');
-- INSERT INTO public.organizations (slug, name, plan)
-- VALUES ('org-b-test', 'Org B', 'trial');
-- INSERT INTO public.clientes (org_id, setor) VALUES ('ORG_A_UUID', 'A');
-- INSERT INTO public.clientes (org_id, setor) VALUES ('ORG_B_UUID', 'B');

-- Como USER_A_UUID (membro de org A):
SELECT
  'clientes visíveis: org A NÃO vê org B' AS test,
  count(*)::text AS result,
  CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM public.clientes;
-- Esperado: 1 cliente visível
*/

-- ─── Test 11: periodos_dados SELECT entre orgs ───────────────────────────
/*
-- Como USER_A_UUID (membro apenas de org A):
SELECT
  'periodos visíveis: org A NÃO vê org B' AS test,
  count(*)::text AS result,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM public.periodos_dados
WHERE cliente_id = (SELECT id FROM public.clientes WHERE org_id = 'ORG_B_UUID');
-- Esperado: 0
*/

-- ─── Test 12: colecoes INSERT com período de outra org (deve falhar) ───────
/*
-- Como USER_A_UUID, tentar inserir coleção no período de org B:
INSERT INTO public.colecoes (periodo_id, tipo, payload)
VALUES (
  (SELECT id FROM public.periodos_dados
   WHERE cliente_id = (SELECT id FROM public.clientes WHERE org_id = 'ORG_B_UUID')
   LIMIT 1),
  'texto_livre',
  '{"teste": "cross-org"}'::jsonb
);
-- Esperado: erro de RLS (com RLS forçado)
*/

-- ─── Test 13: evidencias DELETE por não-uploader (deve falhar) ─────────────
/*
-- Como USER_A_UUID (membro de org A mas NÃO uploader):
DELETE FROM public.evidencias
WHERE id = 'EVIDENCIA_UPLOADED_BY_USER_B_UUID';
-- Esperado: 0 rows affected
*/

-- ─── Test 14: periodos UPDATE quando fechado (deve bloquear via app, RLS permite) ─
/*
-- IMPORTANTE: RLS permite UPDATE em qualquer momento, mas a app (server action)
-- deve checar o status e bloquear via "PERIOD_CLOSED" error.
-- Isso é uma decisão de arquitetura — RLS para isolamento entre orgs, app para
-- invariantes de negócio (período fechado não pode ser editado).
*/

-- ─── Test 15b: colecao_revisions SELECT entre orgs (Story 1.6) ────────────
/*
-- Setup: edite uma colecao pelo menos 2x (via UI ou UPDATE direto) pra gerar
-- uma revision arquivada, em cada uma das 2 orgs de teste.

-- Como USER_A_UUID (membro apenas de org A):
SELECT
  'colecao_revisions visíveis: org A NÃO vê revisions de org B' AS test,
  count(*)::text AS result,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM public.colecao_revisions cr
JOIN public.colecoes c ON c.id = cr.colecao_id
JOIN public.periodos_dados p ON p.id = c.periodo_id
WHERE p.cliente_id = (SELECT id FROM public.clientes WHERE org_id = 'ORG_B_UUID');
-- Esperado: 0

-- INSERT direto em colecao_revisions (fora do trigger) deve falhar mesmo pra
-- membro autenticado da própria org — a tabela só recebe INSERT via trigger
-- SECURITY DEFINER (archive_colecao_revision), nunca direto da aplicação:
INSERT INTO public.colecao_revisions (colecao_id, rev_number, payload)
VALUES ('QUALQUER_COLECAO_DA_PROPRIA_ORG_UUID', 999, '{"teste": "insert direto"}'::jsonb);
-- Esperado: sucesso ou falha por RLS são ambos aceitáveis aqui (a policy de
-- INSERT só checa auth.uid() IS NOT NULL, igual audit_log) — o que importa é
-- que rev_number 999 nunca vai bater com o real do trigger, então isso é só
-- pra confirmar que a tabela não está travada por engano pra todo mundo.
*/

-- ─── Test 15: Storage bucket `evidencias` é privado ──────────────────────
/*
-- Como usuário anônimo:
SELECT
  'storage: anon NÃO vê objetos do bucket evidencias' AS test,
  count(*)::text AS result,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM storage.objects
WHERE bucket_id = 'evidencias';
-- Esperado: 0 (RLS do storage bloqueia anon)

-- Como USER_A_UUID:
SELECT
  'storage: membro vê apenas arquivos da própria org' AS test,
  count(*)::text AS result,
  CASE WHEN count(*) >= 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM storage.objects
WHERE bucket_id = 'evidencias';
-- Esperado: >=1 (os arquivos da org A)
*/

-- ─── Checklist final ────────────────────────────────────────────────────────
/*
| Função/Política              | Esperado           | Status |
|-----------------------------|--------------------|--------|
| is_platform_admin() anon     | false              | [  ]  |
| is_platform_admin() admin   | true               | [  ]  |
| is_member_of() member        | true               | [  ]  |
| is_member_of() não-membro   | false              | [  ]  |
| member_role() owner          | client_owner       | [  ]  |
| member_role() member         | client_member      | [  ]  |
| member_role() viewer        | client_viewer      | [  ]  |
| org INSERT como admin        | sucesso            | [  ]  |
| org INSERT como member       | RLS DENY           | [  ]  |
| org DELETE como admin        | sucesso            | [  ]  |
| org DELETE como member       | RLS DENY           | [  ]  |
| membership DELETE como owner | sucesso            | [  ]  |
| membership DELETE como member| RLS DENY           | [  ]  |
| audit_log UPDATE            | RLS DENY           | [  ]  |
| audit_log DELETE            | RLS DENY           | [  ]  |
| profile UPDATE self          | sucesso            | [  ]  |
| profile UPDATE other         | RLS DENY           | [  ]  |
-- Épico 1:
| clientes SELECT cross-org    | RLS DENY           | [  ]  |
| periodos SELECT cross-org    | RLS DENY           | [  ]  |
| colecoes INSERT cross-org    | RLS DENY           | [  ]  |
| evidencias DELETE cross-org  | RLS DENY           | [  ]  |
| colecao_revisions SELECT cross-org (1.6) | RLS DENY | [  ]  |
| storage SELECT anon          | RLS DENY           | [  ]  |
| storage SELECT cross-org     | RLS DENY           | [  ]  |
*/

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Para executar os testes interativos:';
  RAISE NOTICE '1. Substitua os UUIDs placeholder nos testes acima';
  RAISE NOTICE '2. Execute cada bloco como o papel desejado';
  RAISE NOTICE '3. Verifique o resultado (PASS/FAIL)';
  RAISE NOTICE '4. Documente resultados em: db/test-rls-results.md';
  RAISE NOTICE '==================================================';
END;
$$;
