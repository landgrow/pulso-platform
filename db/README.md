# db/ — Migrations e scripts de banco

## Visão geral

```
db/
├── migrations/
│   ├── 0001_initial_schema.sql       # Tabelas + índices + RLS habilitado
│   ├── 0002_rls_policies.sql        # Funções utilitárias + políticas RLS
│   └── 0003_functions_and_triggers.sql # Triggers (profile auto, audit log)
├── seed.sql                          # Dados de exemplo (dev only)
├── test-rls.sql                     # Scripts de validação RLS
├── apply-migrations.sh              # Script de aplicação
└── README.md                        # Este arquivo
```

## Como aplicar

### Opção 1: Supabase Dashboard (recomendado para staging/prod)

1. Abra o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione o projeto → **SQL Editor**
3. Abra cada arquivo `.sql` na ordem:
   - `0001_initial_schema.sql` → **Run**
   - `0002_rls_policies.sql` → **Run**
   - `0003_functions_and_triggers.sql` → **Run**
4. (Opcional) `seed.sql` → apenas em desenvolvimento

### Opção 2: Script shell

```bash
# Configurar DATABASE_URL primeiro
export DATABASE_URL="postgresql://user:pass@host:5432/postgres"
export PGPASSWORD="senha"

# Aplicar todas
./db/apply-migrations.sh

# Verificar status
./db/apply-migrations.sh --status

# Aplicar apenas uma
./db/apply-migrations.sh 0002
```

### Opção 3: psql direto

```bash
psql "$DATABASE_URL" -f db/migrations/0001_initial_schema.sql
psql "$DATABASE_URL" -f db/migrations/0002_rls_policies.sql
psql "$DATABASE_URL" -f db/migrations/0003_functions_and_triggers.sql
```

## Ordem das migrations

| #    | Conteúdo                       | Dependência |
| ---- | ------------------------------ | ----------- |
| 0001 | Tabelas + índices + RLS ON     | nenhuma     |
| 0002 | Funções helper + políticas RLS | 0001        |
| 0003 | Triggers (profile, audit)      | 0001 + 0002 |

**Importante:** não pule números. A 0002 depende de `is_platform_admin()`, `is_member_of()` e `member_role()` definidos nela mesma.

## Rollback

Postgres/Supabase não tem rollback automático de migrations.
Para reverter:

1. **Cenário simples (sem dados):** drop + recreate

   ```sql
   DROP TABLE IF EXISTS public.audit_log CASCADE;
   DROP TABLE IF EXISTS public.consultant_assignments CASCADE;
   DROP TABLE IF EXISTS public.memberships CASCADE;
   DROP TABLE IF EXISTS public.platform_roles CASCADE;
   DROP TABLE IF EXISTS public.organizations CASCADE;
   DROP TABLE IF EXISTS public.profiles CASCADE;
   ```

2. **Cenário real:** criar nova migration de rollback
   ```sql
   -- 0004_rollback_0003.sql
   DROP TRIGGER IF EXISTS trg_audit_orgs ON public.organizations;
   DROP TRIGGER IF EXISTS trg_audit_memberships ON public.memberships;
   DROP FUNCTION IF EXISTS public.log_audit();
   DROP FUNCTION IF EXISTS public.handle_new_user();
   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
   ```

## Validação

Após aplicar, rode o `test-rls.sql` para validar cada política:

```bash
# No Supabase Dashboard > SQL Editor
# Cole e execute o conteúdo de test-rls.sql
```

O script testa:

- `is_platform_admin()` para anon → deve retornar `false`
- `is_member_of()` para membro → deve retornar `true`
- `is_member_of()` para não-membro → deve retornar `false`
- INSERT em `organizations` como member → deve falhar (RLS DENY)
- INSERT em `organizations` como admin → deve funcionar
- UPDATE/DELETE no `audit_log` → deve falhar (imutável)

## Schema

```
┌─────────────────┐
│  auth.users     │ (Supabase built-in)
└───────┬─────────┘
        │ id FK
        ▼
┌─────────────────┐       ┌──────────────────────────┐
│  profiles       │       │  organizations           │
│  (org_id: none)│       │  (tenant raiz)          │
└─────────────────┘       └──────────┬───────────────┘
                                    │
                                    │ id
                                    ▼
┌─────────────────┐       ┌──────────────────────────┐
│  platform_roles  │       │  memberships             │
│  (Land Grow)     │       │  (user ↔ org)           │
└─────────────────┘       └──────────┬───────────────┘
                                    │
                                    ▼
                          ┌──────────────────────────┐
                          │  consultant_assignments   │
                          │  (consultant → orgs)      │
                          └──────────────────────────┘

┌─────────────────┐
│  audit_log      │ (todas as tabelas)
└─────────────────┘
```

## Papéis disponíveis

| Papel            | Quem            | O que pode fazer        |
| ---------------- | --------------- | ----------------------- |
| `platform_admin` | Land Grow       | Tudo em todas as orgs   |
| `consultant`     | Land Grow       | Ler nas orgs atribuídas |
| `client_owner`   | Dono da empresa | Admin da própria org    |
| `client_member`  | Colaborador     | Usar o produto          |
| `client_viewer`  | Leitor          | Apenas ver relatórios   |

## Segurança

- **RLS FORCE** em todas as tabelas — até o dono da tabela é restringido
- **SECURITY DEFINER** nas funções helper — rodam com privilégios do owner
- **Nenhuma policy `using (true)`** — default-deny, allow explicit
- **Audit log imutável** — sem policies de UPDATE/DELETE

## Troubleshooting

### "permission denied for table ..."

Significa que o RLS está bloqueando. Verifique:

1. `auth.uid()` retorna o usuário correto?
2. O usuário tem `membership` na `organization` correta?
3. A função helper está correta?

```sql
-- Debug: ver qual user está logado
SELECT auth.uid();

-- Debug: ver se é platform admin
SELECT public.is_platform_admin();

-- Debug: ver memberships do usuário
SELECT * FROM public.memberships WHERE user_id = auth.uid();
```

### "new row violates row-level security policy"

Normal — o RLS está funcionando. Verifique qual política está bloqueando e se o papel do usuário permite a operação.

### Trigger não dispara

Verifique se o trigger está criado:

```sql
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public';
```
