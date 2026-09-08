# Modelo de Dados — PULSO

Referência de todas as tabelas do banco, na ordem em que as migrations
(`db/migrations/000N_*.sql`) as criaram. Esta é a fonte da verdade — se algo
aqui divergir do SQL, o SQL está certo e este arquivo está desatualizado.

---

## Diagrama ER

```
organizations (1) ─── (1) profiles [via memberships/platform_roles]
organizations (1) ─── (N) memberships ─── (N) profiles
organizations (1) ─── (1) clientes
clientes (1) ─── (N) periodos_dados
periodos_dados (1) ─── (N) colecoes
periodos_dados (1) ─── (N) evidencias
colecoes (1) ─── (N) colecao_revisions
```

---

## Épico 0 — Fundação (migrations 0001-0004)

### `profiles`

1:1 com `auth.users` (Supabase Auth). Criado automaticamente pelo trigger
`handle_new_user()` quando um usuário se cadastra.

| Coluna                     | Tipo          | Notas                                   |
| -------------------------- | ------------- | --------------------------------------- |
| `id`                       | `uuid PK`     | = `auth.users.id`                       |
| `full_name`                | `text`        |                                         |
| `avatar_url`               | `text`        |                                         |
| `consent_version`          | `text`        | versão da política/termos aceita (0004) |
| `consent_timestamp`        | `timestamptz` | quando aceitou (0004)                   |
| `created_at`, `updated_at` | `timestamptz` |                                         |

### `organizations`

Tenant raiz — cada empresa cliente da Land Grow é uma organização.

| Coluna       | Tipo          | Notas                                      |
| ------------ | ------------- | ------------------------------------------ |
| `id`         | `uuid PK`     |                                            |
| `slug`       | `text UNIQUE` | usado nas rotas `/clientes/[slug]/...`     |
| `name`       | `text`        |                                            |
| `plan`       | `text`        | `trial` / `starter` / `pro` / `enterprise` |
| `deleted_at` | `timestamptz` | soft delete                                |

### `memberships`

Associação usuário ↔ organização com papel de **cliente**.

| Coluna    | Tipo                    | Notas                                              |
| --------- | ----------------------- | -------------------------------------------------- |
| `user_id` | `uuid FK auth.users`    |                                                    |
| `org_id`  | `uuid FK organizations` |                                                    |
| `role`    | `text`                  | `client_owner` / `client_member` / `client_viewer` |
| —         |                         | `UNIQUE(user_id, org_id)` — 1 papel por org        |

### `platform_roles`

Papéis de **staff da Land Grow** (separado de `memberships` de propósito, pra
não confundir "dono da própria empresa" com "admin da plataforma").

| Coluna    | Tipo                    | Notas                           |
| --------- | ----------------------- | ------------------------------- |
| `user_id` | `uuid PK FK auth.users` |                                 |
| `role`    | `text`                  | `platform_admin` / `consultant` |

### `consultant_assignments`

Quais organizações um `consultant` pode acessar (somente leitura).

### `audit_log`

Log imutável (sem policy de UPDATE/DELETE) de ações relevantes. Alimentado
tanto por triggers automáticos (`log_audit()`, em `organizations`/
`memberships`/`profiles`) quanto por chamadas manuais de `logAudit()` dentro
das server actions (`colecoes.ts`, `evidencias.ts`, `texto.ts`,
`periodo-status.ts`, `periods.ts`) para ações que não têm trigger dedicado.

| Coluna          | Tipo    | Notas                                                                        |
| --------------- | ------- | ---------------------------------------------------------------------------- |
| `org_id`        | `uuid`  | pode ser null (ações sem org, ex: platform)                                  |
| `user_id`       | `uuid`  |                                                                              |
| `action`        | `text`  | `create` / `update` / `delete` / `discard` / `restore` / `mark_ready` / etc. |
| `resource_type` | `text`  | nome da tabela/entidade afetada                                              |
| `resource_id`   | `text`  |                                                                              |
| `metadata`      | `jsonb` | contexto específico de cada ação                                             |

---

## Épico 1 — Motor de Coleções (migrations 0005-0008)

### `clientes`

1:1 com `organizations` — dados específicos de empresa (setor, porte, etc.)
que não fazem sentido dentro de `organizations` (que é mais genérica).

| Coluna                                        | Tipo                           | Notas           |
| --------------------------------------------- | ------------------------------ | --------------- |
| `id`                                          | `uuid PK`                      |                 |
| `org_id`                                      | `uuid UNIQUE FK organizations` | 1:1             |
| `cnpj`, `setor`, `porte`, `faturamento_faixa` | `text`                         | todos opcionais |

RLS: `can_access_org(org_id)` em SELECT/UPDATE.

### `periodos_dados`

Competência mensal de coleta — 1 cliente tem N períodos ao longo do tempo.

| Coluna       | Tipo               | Notas                                                         |
| ------------ | ------------------ | ------------------------------------------------------------- |
| `id`         | `uuid PK`          |                                                               |
| `cliente_id` | `uuid FK clientes` |                                                               |
| `mes`        | `int`              | 1-12                                                          |
| `ano`        | `int`              | >= 2024                                                       |
| `status`     | `text`             | `em_coleta` → `pronto_para_analise` → `analisado` → `fechado` |
| `closed_at`  | `timestamptz`      | null se aberto                                                |
| —            |                    | `UNIQUE(cliente_id, ano, mes)`                                |

Transição de status: `updatePeriodData` (genérica, `periods.ts`) ou
`markReadyForAnalysis` (regra de negócio específica, `periodo-status.ts`).
`fechado` congela edição (checado na aplicação, não via RLS — ver nota em
`db/test-rls.sql`, Test 14).

### `colecoes`

Cada "bloco" de dado ingerido: formulário, texto livre ou transcrição de
áudio. Formulário é upsert (1 ativo por período); texto livre é insert-only
(lista de entradas independentes — ver Story 1.5).

| Coluna       | Tipo                     | Notas                                              |
| ------------ | ------------------------ | -------------------------------------------------- |
| `id`         | `uuid PK`                |                                                    |
| `periodo_id` | `uuid FK periodos_dados` |                                                    |
| `tipo`       | `text`                   | `formulario` / `texto_livre` / `transcricao_audio` |
| `status`     | `text`                   | `rascunho` / `validado` / `descartado`             |
| `payload`    | `jsonb`                  | formato depende de `tipo` (ver server actions)     |
| `metadata`   | `jsonb`                  | ex: `{"area": "Financeiro"}`                       |
| `created_by` | `uuid FK profiles`       | quem criou                                         |
| `updated_by` | `uuid FK profiles`       | quem fez a última edição (0007 — ver nota abaixo)  |

**Nota (Story 1.6):** `updated_by` foi adicionado na migration 0007 junto com
o versionamento — sem ela, a autoria de cada revision ficaria incorreta (veja
o trigger `archive_colecao_revision()` mais abaixo).

RLS: INSERT/UPDATE hoje permitem **qualquer membro da org**, incluindo
`client_viewer` — isso é uma inconsistência conhecida com a regra de produto
(`client_viewer` deveria ser somente leitura). Rastreado como task separada,
não corrigido ainda (ver Change Log da Story 1.5).

### `evidencias`

Arquivos brutos: PDF, Excel, CSV, áudio.

| Coluna                                                          | Tipo                     | Notas                                                                     |
| --------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------- |
| `id`                                                            | `uuid PK`                |                                                                           |
| `periodo_id`                                                    | `uuid FK periodos_dados` |                                                                           |
| `tipo`                                                          | `text`                   | `pdf` / `excel` / `csv` / `audio` / `outro`                               |
| `storage_path`                                                  | `text`                   | `{org_id}/{periodo_id}/{evidencia_id}-{filename}` no bucket `evidencias`  |
| `nome_original`, `mime_type`, `tamanho_bytes`, `hash` (SHA-256) |                          |                                                                           |
| `transcricao`, `transcricao_status`                             | `text`                   | null até que a transcrição de áudio seja implementada (adiada, Story 1.5) |
| `uploaded_by`                                                   | `uuid FK profiles`       |                                                                           |

Storage: bucket `evidencias` (privado, 25MB/arquivo, RLS espelhando a
policy desta tabela).

### `colecao_revisions`

Versionamento de `colecoes` — cada UPDATE arquiva a versão anterior aqui
antes de sobrescrever (Story 1.6).

| Coluna                | Tipo               | Notas                                                      |
| --------------------- | ------------------ | ---------------------------------------------------------- |
| `id`                  | `uuid PK`          |                                                            |
| `colecao_id`          | `uuid FK colecoes` |                                                            |
| `rev_number`          | `int`              | incremental por coleção — `UNIQUE(colecao_id, rev_number)` |
| `payload`, `metadata` | `jsonb`            | snapshot da versão substituída                             |
| `change_summary`      | `jsonb`            | array de chaves que mudaram (`["fin_faturamento"]`)        |
| `created_by`          | `uuid FK profiles` | autor **da versão arquivada** (não de quem a substituiu)   |
| `created_at`          | `timestamptz`      | quando essa versão deixou de ser a atual                   |

**Trigger `trg_colecoes_archive`** (`BEFORE UPDATE ON colecoes`): arquiva
`OLD.payload`/`OLD.metadata` aqui sempre que o payload ou metadata realmente
mudam, calcula `change_summary` (união das chaves de `OLD` e `NEW` cujo valor
difere) e seta `NEW.updated_by = auth.uid()`. `SECURITY DEFINER`, mesmo
padrão do `log_audit()` (0003).

**A versão atual de uma coleção NUNCA tem uma linha aqui** — só existe uma
revision quando aquela versão já foi substituída. A timeline
(`listColecaoRevisions`, `src/app/actions/revisions.ts`) sintetiza a versão
atual "virtual" a partir de `colecoes` na hora de montar a UI.

Cleanup: `cleanup_old_revisions(colecao_id, keep_last_n=50)` (0008) — função
manual (não agendada via `pg_cron`; ver comentário na própria migration).

RLS: só SELECT é acessível pra usuários normais (espelha o acesso de
`colecoes`); INSERT só acontece via o trigger `SECURITY DEFINER`; sem
policy de UPDATE/DELETE — revisions são imutáveis.

**⚠️ Migrations 0007 e 0008 nunca foram executadas contra um Postgres real**
neste repositório até a última verificação (ver Change Log de
`docs/stories/epics/epic-1-collections/1.6.story.md`) — foram só revisadas
linha a linha contra os padrões já usados no projeto.

---

## Convenções gerais de RLS

- **Default-deny**: toda tabela nasce com `ENABLE ROW LEVEL SECURITY` +
  `FORCE ROW LEVEL SECURITY` já na migration que a cria.
- **Isolamento entre orgs**: via `can_access_org(org_id)` (helper SQL,
  0002/0003), propagado através dos FKs quando a tabela não tem `org_id`
  direto (ex: `colecoes` isola via `periodo_id → periodos_dados →
cliente_id → clientes → org_id`).
- **Papéis**: `platform_admin` (tudo) > `consultant` (leitura nas orgs
  atribuídas) > `client_owner` > `client_member` > `client_viewer`
  (leitura). A hierarquia é aplicada na aplicação (server actions), não
  uniformemente em toda policy de RLS — ver a nota de `colecoes` acima.
- **Tabelas imutáveis** (`audit_log`, `colecao_revisions`): sem policy de
  UPDATE/DELETE — a ausência de policy já nega por padrão.
- Testes manuais de RLS ficam em `db/test-rls.sql` (roda no Supabase
  Dashboard SQL Editor ou via `psql`, substituindo os UUIDs placeholder —
  não é automatizado em CI).

---

## Referências

- Migrations: `db/migrations/0001` a `0008`.
- Tipos TypeScript espelhando este schema: `src/types/organization.ts`,
  `src/types/collections.ts`.
- Testes de RLS: `db/test-rls.sql`.
- Setup de dados de teste (e2e): `docs/testing/e2e-setup.md`.
