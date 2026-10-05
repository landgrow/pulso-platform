-- =============================================================================
-- PULSO — Verificação do banco antes do lançamento (SOMENTE LEITURA)
-- Cole no SQL Editor do Supabase e rode bloco por bloco. Nada aqui altera dados.
-- Me mande o resultado dos blocos 1, 2 e 3 (ou um print).
-- =============================================================================

-- 1) Funções SECURITY DEFINER que QUALQUER visitante (sem login) consegue chamar.
--    Esperado: só funções que checam permissão dentro delas (admin_*, my_accessible_orgs,
--    can_access_org, is_*). Qualquer função que ESCREVE e não checa quem chama é problema.
select p.proname as funcao,
       pg_get_function_identity_arguments(p.oid) as argumentos,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_executa,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as logado_executa
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and has_function_privilege('anon', p.oid, 'EXECUTE')
order by p.proname;

-- 2) Tabelas do schema public SEM RLS ligada (esperado: nenhuma).
select c.relname as tabela
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1;

-- 3) Políticas permissivas demais (USING/WITH CHECK = true) ou para o papel anon.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
  and (qual = 'true' or with_check = 'true' or 'anon' = any(roles) or 'public' = any(roles))
order by schemaname, tablename, policyname;

-- 4) Políticas do bucket de arquivos (evidencias): deve exigir login e org.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- 5) A função do feed de prazos (migração 0024) existe? (false = rodar 0024; opcional,
--    o app tem caminho alternativo)
select exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'staff_due_cards'
) as staff_due_cards_existe;

-- 6) Usuários criados sem convite (conta sem organização e sem papel de equipe).
--    Se aparecer gente que você não conhece, o cadastro aberto já foi usado.
select u.id, u.email, u.created_at, u.email_confirmed_at is not null as confirmado
from auth.users u
where not exists (select 1 from public.memberships m where m.user_id = u.id)
  and not exists (select 1 from public.platform_roles r where r.user_id = u.id)
order by u.created_at desc;
