# SYSTEM PROMPT — PULSO · Plataforma de Inteligência de Negócios (MVP)

**Land Grow · Versão 2.1 · 11/09/2026**
**Substitui:** o direcionamento "BI conversacional para PME" do PRD v1.1.
**Status:** especificação-mestra para construção do MVP.

**Changelog v2.0 → v2.1:**

- **Motor de Reconciliação reintegrado ao escopo** (v2.0 tinha removido — decisão revertida por Nayara em 11/09/2026). Ver seção 5.7 (schema) e seção 7.5 (fluxo). `lib/reconciliation.js` e `lib/ingestion.js` (já escritos num protótipo anterior) são reaproveitáveis quase sem alteração, portados para Route Handlers.
- **Seção 17** — pesquisa de mercado (Monday, Notion, Bitrix24, Power BI, Tableau, Looker) traduzida em recursos concretos do motor de coleções e do dashboard.
- **Seção 18** — lições de dois protótipos descartados (Google AI Studio + um protótipo vanilla JS), consolidadas em regras diretas de não repetir.
- **Seção 15** (prompt condensado) reescrita incorporando os três pontos acima.

---

## 0. COMO USAR ESTE DOCUMENTO

Este é o **contexto-raiz** para qualquer agente ou desenvolvedor que construir o PULSO.
Tudo que for implementado deve rastrear para uma seção deste documento. Nada de inventar feature
fora do escopo definido na seção 2.

Ordem de leitura: seção 1 (o que é) → 2 (escopo) → 4 (arquitetura) → 5 (dados) → 6 (segurança) →
7–10 (módulos) → 11 (design) → 12–14 (execução).

O bloco condensado para colar como _system prompt_ de um agente de código está na **seção 15**.

---

## 1. O QUE É O PULSO (v2.1)

**PULSO é uma plataforma de inteligência de negócios (BI) da Land Grow.**

Não é "para PME". Atende **empresas de qualquer porte**. O produto é a plataforma onde o cliente:

1. Faz **login** na sua própria conta (usuário e senha).
2. Encontra um **workspace no estilo Notion** — coleções com campos personalizados, colunas
   editáveis e múltiplas visualizações. O time da Land Grow (admin) cria e modifica campos,
   colunas e visualizações.
3. Responde o **BIN** — o formulário de diagnóstico do negócio. Depois de respondido, a Land Grow
   sobe os resultados e a plataforma renderiza um **dashboard visual** do diagnóstico.
4. Preenche o **MIN** — os 13 blocos do Modelo Integrado de Negócios, em 3 fases, construídos ao
   longo do programa de aceleração.
5. Usa o **gestor de tarefas personalizado** e o **planejamento estratégico** do programa.

### O que saiu do escopo nesta versão

| Removido                                           | Motivo                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| IA conversacional / chat com dados                 | Fora do MVP. Reavaliar depois do núcleo pronto.                                                                           |
| Posicionamento "conversacional para PME"           | Atende todos os portes; é BI, não coaching.                                                                               |
| Clones de IA (CEO/Finance/People/Copy)             | Fora do MVP.                                                                                                              |
| Conectores externos (CRM, Open Finance, Instagram) | Fora do MVP. O motor de reconciliação (ver abaixo) funciona só com evidência por upload — não depende de conector nenhum. |
| Geração automática de OKR/SMART/5W2H por IA        | Fora do MVP. OKR/plano de ação viram coleções editáveis manualmente.                                                      |

### O que voltou ao escopo em 11/09/2026

| Reintegrado                                                         | Por quê                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Motor de Reconciliação** (declarado × evidência real, via upload) | Decisão de Nayara: é o diferencial que nenhuma ferramenta de BI genérica (Power BI, Tableau, Looker) tem — cruzar o que o cliente respondeu no BIN contra o que o documento anexado realmente mostra. Não depende de conector externo, só de upload — por isso pode voltar sem reabrir a discussão de conectores. Ver seções 5.7, 7.5 e 18. |

O schema `client-data-schema.json` continua sendo referência conceitual dos **campos do dashboard
do BIN**, mas o dado passa a viver no Postgres, não em arquivo JSON solto.

---

## 2. ESCOPO DO MVP — O QUE CONSTRUIR

### 2.1 Incluído (todos obrigatórios para o MVP)

- **A. Autenticação** — login com e-mail + senha, recuperação de senha, sessão segura.
- **B. Multi-tenant** — cada cliente = uma conta isolada (organização). Nenhum dado vaza entre contas.
- **C. Papéis e permissões** — admin de plataforma (Land Grow), consultor (Land Grow), e usuários do cliente.
- **D. Motor de Coleções ("Notion-like")** — coleções, propriedades/campos personalizados (12+ tipos),
  registros, e visualizações (tabela, quadro/kanban, lista, galeria, calendário). Colunas editáveis,
  reordenáveis, redimensionáveis. Edição inline de células.
- **E. Painel do Admin** — o time da Land Grow cria/edita organizações, convida usuários, e por
  organização gerencia coleções, propriedades, colunas e visualizações. Edita o banco de perguntas
  do BIN e o template do MIN.
- **F. Módulo BIN** — formulário de diagnóstico configurável, captura de respostas, upload/entrada
  dos resultados pela Land Grow, e **dashboard visual** (radar de maturidade por área, scorecards,
  forças, alertas, evolução histórica).
- **G. Módulo MIN** — os 13 blocos (seção 8), organizados nas 3 fases, com editor de conteúdo por
  bloco, status por bloco, navegação por fase e histórico de versões.
- **H. Programa de Aceleração** — planejamento estratégico do programa (marcos/milestones por fase)
  - gestor de tarefas personalizado (uma coleção-template do motor D, com kanban e responsáveis).
- **I. Segurança de dados** — RLS em todas as tabelas, isolamento por organização, criptografia em
  trânsito e em repouso, auditoria, conformidade LGPD (consentimento, exportação, exclusão).
- **J. Motor de Reconciliação** — upload de evidência (PDF/Excel/áudio) por assessment do BIN,
  extração de KPIs via IA, e cruzamento automático contra as respostas declaradas — gera
  inconsistências com severidade que alimentam o `ScoringForm` do admin antes da publicação.
  Ver seções 5.7 e 7.5.

### 2.2 Fora do MVP (não construir agora)

Ver seção 1. Também fora: app mobile nativo, comentários/menções, automações/workflows,
fórmulas calculadas em propriedades, notificações por e-mail além de convite e reset de senha,
importação massiva via API pública, SSO corporativo, MFA (deixar preparado, não obrigatório).

### 2.3 Decisões (confirmadas por Nayara em 30/08/2026)

1. Stack: **Next.js 15 (App Router) + Supabase + Vercel** — confirmado ("a que achar melhor e mais
   segura"). Next.js é a escolha por segurança (SSR + cookies httpOnly + Route Handlers no mesmo
   deploy). Justificativa na seção 4.2.
2. Idioma da interface: **português (pt-BR)**. Sem i18n no MVP.
3. BIN: **10 áreas/setores Land Grow** (seção 7.1), score 0–100 por área. A pessoa responde
   **área por área**: abre o BIN → vê os blocos (um por área) com progresso → clica num bloco →
   responde as perguntas daquela área → volta ao hub. Pode responder em qualquer ordem e em
   sessões diferentes (autosave). Ver seção 7.2.
4. Resultados/scoring do BIN são **inseridos pela Land Grow** (formulário de scoring no painel
   admin ou import de JSON no formato da seção 7.4). O cliente **responde** o questionário; não pontua.
5. MIN: os **13 blocos são fixos** (estrutura da seção 8) e **todos ficam liberados** desde o
   início — mesmo esquema do BIN: a pessoa clica no bloco e vai para as perguntas-guia daquele
   bloco. O _conteúdo_ é editável por consultor e cliente; os títulos/perguntas-guia são
   editáveis só pelo admin.
6. Gestor de tarefas = coleção do motor de coleções com template pré-definido, não um módulo separado.
7. Plano gratuito Supabase no início; migrar para plano pago (PITR/backups) antes do primeiro
   cliente pago em produção.

---

## 3. PERSONAS E PAPÉIS

| Papel            | Quem                                   | Escopo                | Principais permissões                                                                                           |
| ---------------- | -------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `platform_admin` | Núcleo Land Grow (Nayara + sócios)     | Todas as organizações | Tudo: cria orgs, gerencia banco global do BIN e template do MIN, gerencia qualquer coleção.                     |
| `consultant`     | Consultores Land Grow                  | Orgs atribuídas       | Edita coleções/propriedades/visões da org, lança scoring do BIN, preenche MIN, gerencia tarefas e programa.     |
| `client_owner`   | Dono/gestor da empresa cliente         | Só a própria org      | Responde BIN, vê dashboards, edita os 13 blocos do MIN, usa tarefas, convida e gerencia membros da própria org. |
| `client_member`  | Time da empresa cliente                | Só a própria org      | Responde partes atribuídas do BIN, vê dashboards, edita registros permitidos, usa tarefas.                      |
| `client_viewer`  | Convidado do cliente (ex.: investidor) | Só a própria org      | Somente leitura.                                                                                                |

`platform_admin` e `consultant` são flags no perfil global. `client_*` são papéis dentro da
`membership` (org + user). Um usuário Land Grow pode ser membro de várias orgs; um usuário cliente
pertence a **uma** org.

---

## 4. ARQUITETURA GERAL

### 4.1 Visão macro

```
┌───────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR (cliente)                         │
│  Next.js App Router · React · Tailwind · shadcn/ui · Recharts      │
│  - Shell (sidebar + topbar + seletor de org/período)              │
│  - Motor de Coleções (tabela/kanban/lista/galeria/calendário)     │
│  - BIN (formulário + dashboard)                                    │
│  - MIN (13 blocos / 3 fases)                                       │
│  - Tarefas + Programa                                              │
│  - Painel Admin (/admin)                                           │
└───────────────┬───────────────────────────────────────────────────┘
                │ HTTPS · cookies httpOnly (sessão Supabase)
                ▼
┌───────────────────────────────────────────────────────────────────┐
│              NEXT.JS (Vercel) — Server Components + Route Handlers  │
│  - middleware.ts: refresh de sessão + guarda de rotas              │
│  - Server Components leem via supabase-js (RLS aplicada)           │
│  - /api/* Route Handlers: só onde RLS não basta                    │
│      · scoring/publicação do BIN                                   │
│      · convites e provisionamento de org                           │
│      · exportação/exclusão LGPD                                    │
│      · importação de resultados                                    │
│  - service_role key: SÓ no servidor, nunca exposta                 │
└───────────────┬───────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                   │
│  Postgres (RLS default-deny) · Auth (email+senha) ·               │
│  Storage (buckets por org) · Realtime (opcional p/ colaboração)    │
│  Triggers de auditoria · PITR/backups (plano pago)                 │
└───────────────────────────────────────────────────────────────────┘
```

### 4.2 Por que essa stack

- **Next.js + Vercel**: um único deploy para front + endpoints; SSR resolve autenticação com
  segurança (cookies httpOnly via `@supabase/ssr`); Route Handlers cobrem a lógica que não pode
  depender de RLS.
- **Supabase**: Postgres real (o motor de coleções precisa de `jsonb`, índices GIN, RLS),
  Auth pronta, Storage com políticas, tudo gerenciado. Elimina a necessidade de "Vercel Functions
  soltas + banco à parte" do plano antigo.
- **Sem servidor dedicado**: mantém o custo baixo e a operação simples.

### 4.3 Ambientes

| Ambiente     | Uso      | Supabase                                   | Vercel                   |
| ------------ | -------- | ------------------------------------------ | ------------------------ |
| `local`      | Dev      | Supabase CLI (Docker)                      | `next dev`               |
| `preview`    | PRs      | Projeto Supabase de staging                | Deploy automático por PR |
| `production` | Clientes | Projeto Supabase de produção (PITR ligado) | Branch `main`            |

Migrations versionadas em `supabase/migrations/`. Nada de alteração manual de schema em produção.

---

## 5. MODELO DE DADOS (Postgres)

Todas as tabelas de tenant têm `org_id uuid not null` e RLS. Timestamps `created_at`/`updated_at`
em tudo. IDs `uuid` (default `gen_random_uuid()`).

### 5.1 Identidade e tenant

```sql
-- perfil estende auth.users
profiles (
  id uuid pk references auth.users,
  full_name text,
  avatar_url text,
  is_platform_admin boolean not null default false,
  is_consultant boolean not null default false,
  created_at timestamptz default now()
)

orgs (
  id uuid pk,
  name text not null,
  slug text unique not null,
  logo_url text,
  accent_color text default '#6366f1',
  program_stage text check (program_stage in
    ('diagnostico','aceleracao_f1','aceleracao_f2','concluido','pausado')) default 'diagnostico',
  created_by uuid references profiles,
  created_at timestamptz default now()
)

memberships (
  id uuid pk,
  org_id uuid not null references orgs on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  role text not null check (role in
    ('client_owner','client_member','client_viewer')),
  invited_by uuid references profiles,
  accepted_at timestamptz,
  created_at timestamptz default now(),
  unique (org_id, user_id)
)

consultant_assignments (   -- quais consultores atendem qual org
  id uuid pk,
  org_id uuid not null references orgs on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  unique (org_id, user_id)
)

invites (
  id uuid pk,
  org_id uuid not null references orgs on delete cascade,
  email citext not null,
  role text not null,
  token_hash text not null,        -- hash do token, nunca o token puro
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references profiles,
  created_at timestamptz default now()
)
```

### 5.2 Motor de Coleções (Notion-like)

```sql
workspaces (          -- agrupador dentro da org (ex.: "Diagnóstico", "Aceleração", "Operação")
  id uuid pk, org_id uuid not null references orgs on delete cascade,
  name text not null, icon text, position int not null default 0
)

collections (
  id uuid pk,
  org_id uuid not null references orgs on delete cascade,
  workspace_id uuid references workspaces on delete set null,
  name text not null,
  icon text,
  description text,
  is_system boolean not null default false,   -- coleções BIN/MIN/tarefas
  system_key text check (system_key in ('tasks','okrs','action_plan','stakeholders')),
  position int not null default 0,
  created_at timestamptz default now()
)

properties (          -- colunas / campos personalizados
  id uuid pk,
  collection_id uuid not null references collections on delete cascade,
  org_id uuid not null,                       -- desnormalizado p/ RLS
  name text not null,
  type text not null check (type in (
    'text','long_text','number','currency','percent',
    'select','multi_select','status','date','datetime',
    'checkbox','url','email','phone','person','relation','file','rating'
  )),
  config jsonb not null default '{}',          -- ver 5.2.1
  position int not null default 0,
  is_primary boolean not null default false,   -- coluna-título (uma por coleção)
  is_required boolean not null default false,
  is_locked boolean not null default false,    -- campo de sistema, cliente não edita
  created_at timestamptz default now()
)

select_options (
  id uuid pk,
  property_id uuid not null references properties on delete cascade,
  label text not null,
  color text not null default 'gray',
  position int not null default 0
)

records (             -- linhas
  id uuid pk,
  collection_id uuid not null references collections on delete cascade,
  org_id uuid not null,
  data jsonb not null default '{}',            -- { "<property_id>": <valor> }
  position numeric,                            -- ordenação manual (fractional indexing)
  archived boolean not null default false,
  created_by uuid references profiles,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
-- índice: create index on records using gin (data jsonb_path_ops);

record_relations (    -- integridade e lookup reverso das propriedades 'relation'
  id uuid pk,
  org_id uuid not null,
  property_id uuid not null references properties on delete cascade,
  from_record_id uuid not null references records on delete cascade,
  to_record_id uuid not null references records on delete cascade,
  unique (property_id, from_record_id, to_record_id)
)

views (
  id uuid pk,
  collection_id uuid not null references collections on delete cascade,
  org_id uuid not null,
  name text not null,
  type text not null check (type in ('table','board','list','gallery','calendar')),
  config jsonb not null default '{}',          -- ver 5.2.2
  position int not null default 0,
  is_default boolean not null default false,
  created_by uuid references profiles
)
```

#### 5.2.1 `properties.config` por tipo

| Tipo                              | Chaves de `config`                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `text` / `long_text`              | `{ placeholder? }`                                                                      |
| `number` / `currency` / `percent` | `{ precision?, prefix?, suffix?, aggregation? }`                                        |
| `select` / `status`               | opções via `select_options`; `status` adiciona `{ groups: {todo:[],doing:[],done:[]} }` |
| `multi_select`                    | opções via `select_options`                                                             |
| `date` / `datetime`               | `{ format?, includeTime? }`                                                             |
| `person`                          | `{ multiple?: bool }` — valores = array de `user_id` da org                             |
| `relation`                        | `{ targetCollectionId, multiple?: bool }`                                               |
| `file`                            | `{ multiple?: bool, accept?: string[] }` — valores = array de paths no Storage          |
| `rating`                          | `{ max: 5 }`                                                                            |

#### 5.2.2 `views.config`

```json
{
  "filters": [
    {
      "propertyId": "...",
      "op": "eq|neq|contains|gt|lt|before|after|is_empty",
      "value": "..."
    }
  ],
  "sorts": [{ "propertyId": "...", "direction": "asc|desc" }],
  "visibleProperties": ["<propertyId>", "..."],
  "propertyWidths": { "<propertyId>": 220 },
  "groupBy": "<propertyId|null>",
  "boardColumnProperty": "<statusPropertyId>",
  "calendarDateProperty": "<datePropertyId>",
  "cardCoverProperty": "<filePropertyId|null>",
  "pageSize": 50
}
```

### 5.3 BIN — Diagnóstico

```sql
bin_question_bank (          -- global (org_id null) + overrides por org
  id uuid pk, org_id uuid references orgs on delete cascade,   -- null = global
  area text not null,                                          -- ver 7.1
  position int not null default 0,
  text text not null,
  help_text text,
  input_type text not null check (input_type in
    ('scale_0_10','single_choice','multi_choice','number','currency','short_text','long_text')),
  options jsonb default '[]',
  weight numeric not null default 1,
  active boolean not null default true
)

bin_assessments (
  id uuid pk, org_id uuid not null references orgs on delete cascade,
  label text not null,                         -- ex.: "Diagnóstico inicial 2026-08"
  status text not null check (status in ('draft','submitted','scored','published')) default 'draft',
  respondent_id uuid references profiles,
  submitted_at timestamptz, scored_at timestamptz, published_at timestamptz,
  created_at timestamptz default now()
)

bin_answers (
  id uuid pk, org_id uuid not null,
  assessment_id uuid not null references bin_assessments on delete cascade,
  question_id uuid not null references bin_question_bank,
  value jsonb not null,
  answered_by uuid references profiles,
  updated_at timestamptz default now(),
  unique (assessment_id, question_id)
)

bin_assessment_areas (      -- progresso do respondente por área (hub do BIN)
  id uuid pk, org_id uuid not null,
  assessment_id uuid not null references bin_assessments on delete cascade,
  area text not null,                          -- ver 7.1
  status text not null check (status in ('nao_iniciada','em_andamento','respondida'))
    default 'nao_iniciada',
  answered_count int not null default 0,
  total_count int not null default 0,
  completed_at timestamptz,
  unique (assessment_id, area)
)

bin_scores (                 -- lançado pela Land Grow
  id uuid pk, org_id uuid not null,
  assessment_id uuid not null references bin_assessments on delete cascade,
  area text not null,
  score_0_100 int not null check (score_0_100 between 0 and 100),
  diagnostico text, evidencia text, risco text, oportunidade text,
  unique (assessment_id, area)
)

bin_kpis (                   -- KPIs do período (faturamento, margem, etc.)
  id uuid pk, org_id uuid not null,
  assessment_id uuid not null references bin_assessments on delete cascade,
  key text not null, value numeric, unit text,
  unique (assessment_id, key)
)

bin_findings (               -- forças, alertas e inconsistências (reconciliação, v2.1)
  id uuid pk, org_id uuid not null,
  assessment_id uuid not null references bin_assessments on delete cascade,
  kind text not null check (kind in ('forca','alerta','inconsistencia')),
  title text not null, description text,
  severity text check (severity in ('alta','media','baixa')),  -- inconsistencia usa 'critica'/'moderada' (ver 5.7)
  area text,
  declarado text, evidencia_real text, tolerancia numeric      -- só preenchidos quando kind='inconsistencia'
)
```

Histórico/evolução: derivado de `bin_scores` + `bin_kpis` agregados por `assessment` ao longo do tempo.

### 5.4 MIN — Modelo Integrado de Negócios

```sql
min_template_blocks (        -- 13 blocos, editável só por platform_admin
  id uuid pk,
  number int not null unique check (number between 1 and 13),
  key text not null unique,           -- ex.: 'proposta_de_valor'
  title text not null,
  phase int not null check (phase between 1 and 3),
  sectors text[] not null,            -- ver 8
  guiding_questions jsonb not null default '[]',   -- perguntas-guia exibidas ao preencher
  is_min_exclusive boolean not null default false  -- bloco 5
)

min_canvases (
  id uuid pk, org_id uuid not null references orgs on delete cascade,
  label text not null default 'MIN', status text not null
    check (status in ('nao_iniciado','em_andamento','concluido')) default 'nao_iniciado',
  created_at timestamptz default now()
)

min_blocks (                 -- instância dos 13 blocos por canvas
  id uuid pk, org_id uuid not null,
  canvas_id uuid not null references min_canvases on delete cascade,
  template_block_id uuid not null references min_template_blocks,
  content jsonb not null default '{}',      -- respostas às perguntas-guia + texto livre
  status text not null check (status in ('vazio','em_andamento','em_revisao','concluido')) default 'vazio',
  updated_by uuid references profiles, updated_at timestamptz default now(),
  unique (canvas_id, template_block_id)
)

min_block_history (
  id uuid pk, org_id uuid not null,
  block_id uuid not null references min_blocks on delete cascade,
  content jsonb not null, status text not null,
  changed_by uuid references profiles, changed_at timestamptz default now()
)
```

### 5.5 Programa de Aceleração

```sql
programs (
  id uuid pk, org_id uuid not null references orgs on delete cascade,
  name text not null default 'Aceleração 12 meses',
  current_phase text check (current_phase in ('f1','f2')) default 'f1',
  f1_start date, f1_end date, f2_start date, f2_end date,
  created_at timestamptz default now()
)

program_milestones (
  id uuid pk, org_id uuid not null,
  program_id uuid not null references programs on delete cascade,
  title text not null, description text,
  phase text not null check (phase in ('f1','f2')),
  month_index int check (month_index between 1 and 12),
  due_date date,
  status text not null check (status in ('planejado','em_andamento','concluido','atrasado')) default 'planejado',
  position int not null default 0
)
```

Tarefas: coleção `is_system=true, system_key='tasks'` com propriedades pré-criadas
(Título, Status, Responsável, Prazo, Prioridade, Fase, Bloco MIN relacionado). Kanban por Status.

### 5.6 Auditoria

```sql
audit_log (
  id bigint generated always as identity pk,
  org_id uuid,
  actor_id uuid references profiles,
  action text not null,               -- 'insert'|'update'|'delete'|'login'|'export'|'invite'...
  entity_type text not null,
  entity_id uuid,
  diff jsonb,
  ip inet, user_agent text,
  created_at timestamptz default now()
)
```

Triggers `AFTER INSERT/UPDATE/DELETE` nas tabelas sensíveis (`records`, `bin_*`, `min_blocks`,
`memberships`, `properties`, `views`) gravam em `audit_log`.

### 5.7 Motor de Reconciliação (reintegrado v2.1)

Cruza o que o cliente **declarou** no BIN contra o que a **evidência real** (documento anexado)
mostra. Não depende de conector externo — só de upload. Módulos `lib/reconciliation.js` e
`lib/ingestion.js` de um protótipo anterior já implementam a lógica de extração e matching;
portar para Route Handlers (seção 6.3), sem reescrever do zero.

```sql
bin_evidence (                -- documento anexado como prova, por assessment
  id uuid pk, org_id uuid not null,
  assessment_id uuid not null references bin_assessments on delete cascade,
  area text,                                    -- null = evidência geral (ex.: DRE cobre várias áreas)
  storage_path text not null,                   -- bucket org-files
  tipo_arquivo text,                            -- pdf | xlsx | csv | audio
  kpis_extraidos jsonb default '{}',            -- saída do parser (lib/ingestion.js)
  uploaded_by uuid references profiles,
  created_at timestamptz default now()
)
```

`bin_findings.kind` ganha um terceiro valor: `'inconsistencia'` (além de `'forca'`/`'alerta'`), com as
colunas `declarado`/`evidencia_real`/`tolerancia` já refletidas na definição da tabela (seção 5.3).

**Regras de match** (mesma lógica do protótipo anterior):

- **Numérica** — desvio tolerável configurável por métrica (nunca um ±10% genérico fixo).
- **Categórica** — resposta sim/não do BIN vs. presença/ausência de evidência.
- **Semântica** — texto livre do BIN vs. conteúdo do documento, via Claude API.

**Severidade**: `critica` (contradiz com impacto direto — ex.: nega inadimplência que aparece no
extrato), `moderada` (desvio relevante sem risco imediato), `leve` (lacuna de dado, não contradição).
Só `critica` e `moderada` viram `bin_findings`; `leve` fica só em `bin_evidence.kpis_extraidos` como
contexto.

---

## 6. SEGURANÇA DE DADOS

### 6.1 Autenticação

- Supabase Auth, provedor **e-mail + senha**.
- Confirmação de e-mail **obrigatória** antes do primeiro acesso.
- Política de senha: mínimo 10 caracteres, checagem contra lista de senhas vazadas (Supabase
  "leaked password protection" ligado).
- Sessão: JWT de acesso curto (1 h) + refresh token; cookies **httpOnly, Secure, SameSite=Lax**
  gerenciados por `@supabase/ssr`. Nunca guardar token em `localStorage`.
- `middleware.ts` renova a sessão a cada request e bloqueia rotas privadas.
- Recuperação de senha por link com expiração de 1 h.
- MFA (TOTP): schema e UI preparados, ativação opcional — **não** obrigatório no MVP.

### 6.2 Autorização — RLS (default deny)

Toda tabela de tenant: `alter table X enable row level security;` sem policy = ninguém acessa.

Funções auxiliares (SECURITY DEFINER, `search_path` fixo):

```sql
is_platform_admin()  -> boolean         -- lê profiles.is_platform_admin do auth.uid()
is_member_of(org uuid) -> boolean       -- existe membership OR consultant_assignment OR platform_admin
member_role(org uuid) -> text           -- papel efetivo do usuário na org
```

Padrão de policy (exemplo `records`):

```sql
create policy records_select on records for select
  using ( is_member_of(org_id) );

create policy records_write on records for all
  using ( is_member_of(org_id) and member_role(org_id) <> 'client_viewer' )
  with check ( is_member_of(org_id) and member_role(org_id) <> 'client_viewer' );
```

- `bin_scores`, `bin_kpis`, `bin_findings`: **insert/update** só para `consultant`/`platform_admin`.
  `select` para qualquer membro **se** `assessment.status = 'published'` (cliente não vê rascunho).
- `bin_question_bank` global (org_id null): `select` para todos os autenticados; `write` só platform_admin.
- `min_template_blocks`: `select` todos; `write` só platform_admin.
- `properties`/`views`/`collections`: `write` para `consultant`/`platform_admin` e para `client_owner`
  **apenas** em coleções não-sistema (`is_system=false`) e propriedades não travadas (`is_locked=false`).
- `audit_log`: `select` só platform_admin e consultor da org; ninguém faz `update`/`delete`.

### 6.3 Route Handlers (`/api/*`) — quando e como

Usar `service_role` **somente** nestes casos, sempre revalidando permissão no início do handler:

| Endpoint                                         | Por quê não dá via RLS                                                                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/orgs`                                 | Cria org + membership do owner + convite numa transação.                                                                         |
| `POST /api/invites` / `POST /api/invites/accept` | Gera/valida token, cria membership.                                                                                              |
| `POST /api/bin/[id]/evidence`                    | Upload de arquivo (Storage) + extração de KPIs via IA (porta `lib/ingestion.js`).                                                |
| `POST /api/bin/[id]/reconcile`                   | Roda o motor de reconciliação (porta `lib/reconciliation.js`) contra `bin_evidence`, grava `bin_findings kind='inconsistencia'`. |
| `POST /api/bin/[id]/score`                       | Valida completude, calcula médias, muda status.                                                                                  |
| `POST /api/bin/[id]/publish`                     | Transição de estado + snapshot para histórico.                                                                                   |
| `POST /api/bin/import`                           | Ingesta JSON (formato 7.4) com validação de schema.                                                                              |
| `GET /api/orgs/[id]/export`                      | Exportação LGPD (todas as tabelas da org em JSON/ZIP).                                                                           |
| `POST /api/orgs/[id]/delete`                     | Exclusão/anonimização LGPD com carência.                                                                                         |

Toda entrada validada com **Zod** antes de tocar o banco. Erros seguem o padrão da seção 13.4.

### 6.4 Armazenamento de arquivos

- Bucket privado `org-files`. Caminho: `org/{org_id}/{collection_id}/{record_id}/{uuid}-{filename}`.
- Storage policies espelham a RLS: só membros da org leem/escrevem naquele prefixo.
- Uploads via URL assinada gerada no servidor. Limite 25 MB/arquivo. Tipos aceitos: PDF, PNG, JPG,
  XLSX, CSV, DOCX. Rejeitar executáveis.
- Antivírus: fora do MVP; registrar como risco aceito.

### 6.5 Criptografia e segredos

- Em trânsito: HTTPS obrigatório (HSTS). Em repouso: criptografia nativa do Postgres/Storage Supabase.
- Segredos (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, chaves de e-mail) só em variáveis de
  ambiente da Vercel (server-side). Prefixo `NEXT_PUBLIC_` **apenas** para URL e anon key.
- Nunca logar tokens, senhas ou PII em texto. Logs de erro sem corpo de request sensível.

### 6.6 Cabeçalhos e hardening

`next.config` + middleware:

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: blob: <supabase-url>;
  connect-src 'self' <supabase-url>; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
  frame-ancestors 'none'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- Rate limiting nos `/api/*` (Upstash Ratelimit ou, no MVP, limitador em memória por IP+rota):
  auth 10/min, import 5/min, geral 60/min.
- Proteção CSRF: mutações só via `POST`/`PATCH`/`DELETE` com verificação de `Origin`/`Sec-Fetch-Site`.
- Dependências: `npm audit` no CI, Dependabot ligado.

### 6.7 LGPD

- **Base legal**: execução de contrato + consentimento para dados de diagnóstico.
- **Consentimento** no cadastro: checkbox obrigatório com link para Política de Privacidade e Termos.
- **Titular de dados** (usuários e dados da empresa cliente): direito a acesso, correção,
  portabilidade e exclusão — atendidos por `GET /api/orgs/[id]/export` e `POST /api/orgs/[id]/delete`.
- **Retenção**: dados mantidos enquanto durar o contrato + 12 meses; depois anonimização.
- **Sub-processadores**: Supabase (hospedagem/BD), Vercel (aplicação), provedor de e-mail. Listar
  na Política de Privacidade.
- **Encarregado (DPO)**: contato publicado (e-mail dedicado).
- **Incidentes**: runbook de resposta (detectar → conter → notificar ANPD/titulares em prazo legal).
- **Ambiente**: dados de produção só em projeto Supabase de produção; proibido copiar para dev.

### 6.8 Backups e continuidade

- Produção: Supabase **PITR** (plano pago) — RPO ≤ 24 h, idealmente contínuo.
- Export lógico semanal (`pg_dump`) para storage frio separado.
- Teste de restauração trimestral documentado.

---

## 7. MÓDULO BIN — DIAGNÓSTICO

### 7.1 As 10 áreas/setores Land Grow (canônicas — usadas por BIN e MIN)

`Estratégico · Financeiro · Comercial/Vendas · Marketing · Operacional · Administrativo ·
Pessoas/RH · Liderança · Jurídico · Inovação`

### 7.2 Fluxo

```
1. Admin cria um bin_assessment para a org (label). Ao criar, o sistema gera 10 linhas em
   bin_assessment_areas (uma por área da seção 7.1) com status 'nao_iniciada' e total_count =
   nº de perguntas ativas do banco naquela área (global + overrides da org).

2. HUB DO BIN (tela que a pessoa vê ao clicar em "BIN"):
   - Grid de 10 blocos, um por área (Estratégico, Financeiro, Comercial/Vendas, ...).
   - Cada bloco mostra: nome da área, ícone, barra de progresso (answered_count/total_count),
     selo de status (Não iniciada / Em andamento / Respondida).
   - Barra geral no topo: X/10 áreas respondidas.

3. RESPONDER UMA ÁREA:
   - Clica no bloco → tela com só as perguntas ativas daquela área, na ordem (position).
   - Tipos de input conforme bin_question_bank.input_type (escala 0–10, escolha única/múltipla,
     número, moeda, texto curto/longo).
   - Autosave a cada resposta → grava/atualiza bin_answers; recalcula answered_count e status
     ('em_andamento' quando answered_count > 0; 'respondida' quando answered_count = total_count
     OU quando a pessoa clica "Marcar área como respondida").
   - Botão "Voltar ao BIN" retorna ao hub. Pode sair e continuar depois.
   - Ordem livre entre áreas; sessões múltiplas permitidas.

4. ENVIAR O DIAGNÓSTICO:
   - Quando todas as 10 áreas estão 'respondida', habilita "Enviar diagnóstico".
   - Enviar → bin_assessments.status = 'submitted', todas as bin_answers travadas (read-only).

5. Land Grow analisa (fora da plataforma) e lança o resultado:
   - Painel admin: formulário de scoring por área (score 0–100 + diagnóstico / evidência / risco /
     oportunidade), KPIs do período, forças e alertas.
   - OU import JSON (formato 7.4).  → status 'scored'.

6. Land Grow clica "Publicar" → status 'published'. Só agora o cliente vê o dashboard (seção 7.3).

7. Próximo diagnóstico = novo bin_assessment. A evolução histórica compara assessments publicados.
```

**Regras de visibilidade por status:**

| Status      | Cliente vê                            | Cliente edita respostas |
| ----------- | ------------------------------------- | ----------------------- |
| `draft`     | hub + telas de resposta               | sim (autosave)          |
| `submitted` | hub (só leitura) + aviso "em análise" | não                     |
| `scored`    | igual a `submitted`                   | não                     |
| `published` | hub (leitura) + **dashboard**         | não                     |

### 7.3 Dashboard do BIN (visualizações)

| Bloco               | Visual                                                                                             | Fonte                                |
| ------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Maturidade por área | **Radar** (10 eixos, 0–100) + barras horizontais ordenadas                                         | `bin_scores`                         |
| Score geral         | Gauge / número grande (média ponderada)                                                            | `bin_scores`                         |
| KPIs do período     | Cards (faturamento, margem, clientes ativos, ticket médio, inadimplência, crescimento)             | `bin_kpis`                           |
| Forças              | Lista com ícone positivo                                                                           | `bin_findings kind='forca'`          |
| Alertas             | Lista com selo de severidade (alta/média/baixa)                                                    | `bin_findings kind='alerta'`         |
| Inconsistências     | Lista "declarado × real" com severidade (crítica/moderada), só aparece quando há evidência anexada | `bin_findings kind='inconsistencia'` |
| Análise por área    | Accordion: diagnóstico + evidência + risco + oportunidade                                          | `bin_scores`                         |
| Evolução histórica  | **Linha** (score médio por assessment) + linhas por área + KPIs no tempo                           | agregação                            |
| Exportar            | Botão "Exportar PDF" (render server-side ou print CSS)                                             | —                                    |

### 7.4 Formato de import de resultados (`POST /api/bin/import`)

```json
{
  "assessmentId": "uuid",
  "kpis": {
    "faturamento": 850000,
    "margem": 18.5,
    "clientes_ativos": 240,
    "ticket_medio": 3541,
    "inadimplencia": 4.2,
    "crescimento": 6.1
  },
  "scores": [
    {
      "area": "Financeiro",
      "score": 61,
      "diagnostico": "...",
      "evidencia": "...",
      "risco": "...",
      "oportunidade": "..."
    }
  ],
  "forcas": ["Time comercial consistente", "..."],
  "alertas": [
    {
      "title": "CREA irregular",
      "severity": "alta",
      "area": "Jurídico",
      "description": "..."
    }
  ]
}
```

Validação Zod: áreas ∈ lista 7.1, score 0–100, severidade ∈ enum. Import é idempotente por
`assessmentId` (substitui scores/kpis/findings anteriores daquele assessment).

### 7.5 Fluxo do Motor de Reconciliação (reintegrado v2.1)

Roda **entre** `submitted` e `scored` — depois que o cliente trava as respostas, antes da Land Grow
publicar. Não é obrigatório (funciona sem evidência), mas quando há evidência, o achado entra na
tela de scoring como insumo, não como substituto do julgamento do consultor.

```
1. Cliente (ou consultor) sobe evidência: POST /api/bin/[id]/evidence
   — PDF/Excel/áudio → Storage (org-files/{org}/bin/{assessment}/...)
   — extração de KPIs via IA (lib/ingestion.js) → bin_evidence.kpis_extraidos

2. Consultor/admin dispara: POST /api/bin/[id]/reconcile
   — cruza bin_answers (declarado) × bin_evidence.kpis_extraidos (real)
   — regras: numérica (tolerância por métrica) · categórica (sim/não vs. presença) ·
     semântica (texto livre vs. documento, via Claude API)
   — grava bin_findings kind='inconsistencia', severidade crítica/moderada

3. ScoringForm (admin, seção 10) mostra as inconsistências junto com o formulário de
   score/KPI/forças/alertas — o consultor decide o que vira achado publicado, não é automático.

4. Publicar (seção 7.2, passo 6) inclui as inconsistências confirmadas no dashboard do cliente,
   com o mesmo tratamento visual dos alertas (severidade crítica = destaque vermelho).
```

**Regra de ouro** (mesma do protótipo anterior): antes de marcar algo como inconsistência, a
pergunta é sempre "isso é contradição de verdade, ou só falta o dado pra comparar?" — falta de
dado é `leve` (não vira finding), só contradição real com impacto vira `critica`/`moderada`.

---

## 8. MÓDULO MIN — 13 BLOCOS / 3 FASES

Estrutura fixa (do canvas "O Modelo Integrado de Negócios · Land Grow"):

### FASE 1 · FUNDAÇÃO

| Nº  | Bloco                       | Setores                            |
| --- | --------------------------- | ---------------------------------- |
| 1   | Proposta de Valor           | Estratégico, Inovação, Vendas      |
| 2   | Segmentos de Clientes       | Marketing, Vendas                  |
| 3   | Atividades-Chave            | Operacional, Administrativo, RH    |
| 4   | Modelo de Receita           | Financeiro, Vendas, Estratégico    |
| 5   | Comportamento do Consumidor | Transversal · **exclusivo do MIN** |
| 6   | Jornada do Cliente          | Liderança, Marketing, Vendas       |

### FASE 2 · OPERAÇÃO

| Nº  | Bloco                 | Setores                     |
| --- | --------------------- | --------------------------- |
| 7   | Canais de Engajamento | Marketing, Vendas, Inovação |
| 8   | Recursos Estratégicos | RH, Inovação, Estratégico   |
| 9   | Estrutura de Custos   | Financeiro, Administrativo  |

### FASE 3 · CONSOLIDAÇÃO

| Nº  | Bloco                    | Setores                              |
| --- | ------------------------ | ------------------------------------ |
| 10  | Ecossistema de Parceiros | Jurídico, Inovação, Estratégico      |
| 11  | Métricas de Impacto      | Estratégico, Financeiro, Operacional |
| 12  | Cultura & Valores        | Liderança, RH, Jurídico              |
| 13  | Gestão de Riscos         | Jurídico, Operacional, Financeiro    |

### 8.1 Comportamento

Mesmo padrão do BIN (hub → clica no bloco → responde perguntas).

- Seed inicial: popular `min_template_blocks` com os 13 registros acima + `guiding_questions`
  (3–6 perguntas-guia por bloco — a Land Grow define o texto; deixar placeholders editáveis).
- Ao criar um `min_canvas`, gerar automaticamente os 13 `min_blocks` com `status='vazio'`.
  **Todos os 13 blocos ficam liberados desde o início** — não há trava por fase nem liberação
  progressiva.
- **HUB DO MIN**: `CanvasGrid` com as 3 fases (Fundação / Operação / Consolidação) e os 13 blocos
  no layout da imagem — cada card com nº, título, setores, selo de status e % preenchido.
  Barra geral: X/13 blocos concluídos + % por fase.
- **RESPONDER UM BLOCO**: clica no card → tela do bloco com as `guiding_questions` (campos
  long_text) + um campo de texto livre + anexos (Storage). Autosave. Botão "Voltar ao MIN".
- **Status por bloco** (a pessoa ajusta): vazio → em_andamento → em_revisão → concluído.
  Cada salvamento grava versão em `min_block_history`.
- **Permissão**: consultor e `client_owner`/`client_member` editam qualquer bloco;
  `client_viewer` só lê. Sem allowlist.
- Bloco 5 — Comportamento do Consumidor (`is_min_exclusive=true`): destacar visualmente como
  "exclusivo MIN" (selo), mas editável como os outros.

---

## 9. GESTOR DE TAREFAS + PLANEJAMENTO ESTRATÉGICO

### 9.1 Tarefas (via motor de coleções)

Ao provisionar uma org, criar a coleção sistema `Tarefas` (`system_key='tasks'`) com propriedades:

| Propriedade | Tipo             | Config                                                                                         |
| ----------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| Título      | `text` (primary) | —                                                                                              |
| Status      | `status`         | grupos: A Fazer / Fazendo / Concluído; opções: Backlog, A fazer, Fazendo, Bloqueado, Concluído |
| Responsável | `person`         | multiple                                                                                       |
| Prazo       | `date`           | —                                                                                              |
| Prioridade  | `select`         | Baixa, Média, Alta, Urgente                                                                    |
| Fase        | `select`         | Diagnóstico, Aceleração F1, Aceleração F2                                                      |
| Bloco MIN   | `relation`       | targetCollection = (opcional) coleção espelho do MIN, ou `select` com os 13                    |
| Notas       | `long_text`      | —                                                                                              |

Views padrão: **Quadro** (por Status), **Tabela** (todas), **Calendário** (por Prazo),
**Lista** "Minhas tarefas" (filtro Responsável = usuário atual).

### 9.2 Planejamento estratégico do programa

- Página `Programa` mostra: fase atual, datas F1/F2, e uma **linha do tempo de marcos**
  (`program_milestones`) agrupada por mês (1–12), com status e barra de progresso.
- Admin/consultor cria e edita marcos. Cliente visualiza e comenta status (muda status se for owner).
- Ligação opcional: marco → tarefas relacionadas (relation) e → blocos MIN da fase.

---

## 10. PAINEL DO ADMIN (`/admin`)

Acesso: `is_platform_admin` ou `is_consultant` (consultor só vê orgs atribuídas).

| Seção                        | Função                                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Organizações**             | Listar/criar org, definir slug, logo, cor de destaque, estágio do programa. Arquivar.                                                                                          |
| **Usuários & Convites**      | Convidar usuário para uma org com papel; reenviar/revogar convite; listar membros; atribuir consultores.                                                                       |
| **Coleções**                 | Por org: criar coleção, definir workspace, ícone; reordenar; marcar sistema.                                                                                                   |
| **Propriedades/Colunas**     | Adicionar campo (escolher tipo), editar nome/config, reordenar (drag), travar (`is_locked`), excluir (com aviso de perda de dados). Gerenciar opções de select/status e cores. |
| **Visualizações**            | Criar/editar view (tabela/kanban/lista/galeria/calendário), configurar filtros, ordenação, colunas visíveis, agrupamento, largura de coluna, definir view padrão.              |
| **BIN — Banco de Perguntas** | CRUD de perguntas globais e overrides por org; ordenar por área; ativar/desativar; definir peso.                                                                               |
| **BIN — Scoring**            | Abrir assessment submetido, lançar scores/KPIs/forças/alertas, publicar.                                                                                                       |
| **MIN — Template**           | Editar títulos, setores e perguntas-guia dos 13 blocos (global).                                                                                                               |
| **Auditoria**                | Filtrar `audit_log` por org, ator, entidade, período.                                                                                                                          |
| **Exportações LGPD**         | Gerar export ou solicitar exclusão de uma org.                                                                                                                                 |

O admin é **construção primária** (não é "nice to have"): sem ele o cliente não tem coleções nem
BIN configurado.

---

## 11. PARTE GRÁFICA / DESIGN SYSTEM

### 11.1 Princípios

Limpo, denso de informação, escuro por padrão (com tema claro disponível), inspiração
Notion + Linear. A marca Land Grow aparece pelo **verde-limão** como cor de dado/acento
secundário; o roxo/indigo é a cor primária de ação.

### 11.2 Tokens (CSS variables / Tailwind theme)

```
/* Base — dark (default) */
--bg:            #0a0f1e
--surface-1:     #111827
--surface-2:     #1a2340
--surface-3:     #232d4d
--border:        #26304d
--border-strong: #38446b
--text-1:        #e8ecf5   /* primário */
--text-2:        #9aa5c0   /* secundário */
--text-3:        #6b7699   /* terciário/placeholder */

/* Acentos */
--primary:       #6366f1   /* indigo — ações, links, seleção */
--primary-hover:  #4f46e5
--brand-lime:    #b8f000   /* Land Grow — realce de dado, MIN, KPIs */
--brand-lime-ink: #0a0f1e  /* texto sobre lime */

/* Semânticos */
--success: #22c55e   --warning: #f59e0b   --danger: #ef4444   --info: #38bdf8

/* Tema claro: inverter surfaces (bg #f7f8fb, surface #fff, texto #1a2340...),
   manter primary e brand-lime. Definir todos os tokens também em :root[data-theme=light]. */
```

Cores de rótulo (select/status), 10 opções: gray, blue, indigo, purple, pink, red, orange,
yellow, green, teal — cada uma com par (bg suave + texto forte) para os dois temas.

### 11.3 Tipografia / espaçamento / raio

- Fonte UI: **Inter** (fallback: system-ui). Números tabulares em tabelas e KPIs.
- Escala: 12 / 13 / 14 (base) / 16 / 20 / 24 / 32 / 40.
- Espaçamento (px): 4, 8, 12, 16, 24, 32, 48, 64.
- Raio: 6 (inputs/botões), 8 (cards), 12 (modais/painéis). Sombra sutil só em overlays.
- Densidade de tabela: linha de 36–40 px; modo "compacto" 32 px.

### 11.4 Componentes (construir sobre shadcn/ui + Radix)

Shell: `AppSidebar`, `Topbar` (org switcher, seletor de período/assessment, menu do usuário,
toggle de tema), `Breadcrumbs`, `CommandMenu` (⌘K — fase 2, deixar hook pronto).

Coleções: `DataTable` (colunas redimensionáveis/reordenáveis via dnd-kit, edição inline por tipo
de célula, adicionar linha inline, seleção múltipla, paginação), `BoardView` (kanban dnd),
`ListView`, `GalleryView`, `CalendarView`, `ViewSwitcher`, `ViewConfigPopover`, `FilterBuilder`,
`SortMenu`, `PropertyEditorDrawer`, `PropertyTypeMenu`, `CellRenderer`/`CellEditor` por tipo,
`RelationPicker`, `PersonPicker`, `SelectOptionManager`.

BIN: `BinAreaHub` (grid das 10 áreas com progresso/status/barra geral), `AreaCard`,
`FormRenderer` (renderiza perguntas de uma área por `input_type`, autosave), `ScaleInput`,
`SubmitAssessmentButton` (habilita em 10/10), `AssessmentStatusBadge`, `ScoringForm` (admin),
`RadarChart`, `ScoreBars`, `ScoreGauge`, `KpiCard`, `FindingsList`, `AreaAnalysisAccordion`,
`HistoryLineChart`, `ExportPdfButton`.

MIN: `CanvasGrid` (3 fases, 13 blocos — visual da imagem, todos liberados), `BlockCard`
(nº, título, setores, status, %), `BlockEditor` (perguntas-guia + texto livre + anexos +
seletor de status), `PhaseProgress`, `BlockHistoryTimeline`.

Programa/Tarefas: `MilestoneTimeline`, `PhaseSwitcher`, `TaskBoard` (reusa `BoardView`).

Genéricos: `Button`, `Input`, `Textarea`, `Select`, `Combobox`, `DatePicker`, `Checkbox`,
`Toggle`, `Tabs`, `Dialog`, `Drawer`, `Popover`, `DropdownMenu`, `Tooltip`, `Toast`, `Badge`,
`Avatar`, `EmptyState`, `Skeleton`, `Pagination`, `ConfirmDialog`.

### 11.5 Gráficos

Biblioteca: **Recharts** (ou visx se precisar de radar melhor). Paleta: eixo/grid em `--border`,
séries primárias em `--primary` e `--brand-lime`, semânticos para severidade. Sempre com
`ResponsiveContainer`, tooltip custom no tema, e fallback textual/acessível (tabela oculta para
leitores de tela).

### 11.6 Acessibilidade

Contraste AA mínimo; foco visível (anel `--primary`); navegação por teclado em tabela, kanban e
menus (Radix cobre a maior parte); `aria-label` em ícones-botão; respeitar `prefers-reduced-motion`.

---

## 12. ESTRUTURA DE PASTAS (Next.js App Router)

```
pulso/
├── src/
│   ├── app/
│   │   ├── (marketing)/                 # landing/login pública
│   │   │   ├── login/page.tsx
│   │   │   ├── esqueci-senha/page.tsx
│   │   │   ├── redefinir-senha/page.tsx
│   │   │   └── convite/[token]/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx               # shell autenticado (sidebar+topbar)
│   │   │   └── [orgSlug]/
│   │   │       ├── page.tsx             # visão geral da org
│   │   │       ├── bin/
│   │   │       │   ├── page.tsx                        # lista de diagnósticos
│   │   │       │   ├── [assessmentId]/page.tsx         # HUB: grid das 10 áreas
│   │   │       │   ├── [assessmentId]/area/[area]/page.tsx   # responder área
│   │   │       │   └── [assessmentId]/dashboard/page.tsx
│   │   │       ├── min/
│   │   │       │   ├── page.tsx                        # HUB: canvas grid (13 blocos)
│   │   │       │   └── [blockId]/page.tsx              # responder bloco
│   │   │       ├── programa/page.tsx
│   │   │       ├── tarefas/page.tsx
│   │   │       ├── c/[collectionId]/page.tsx    # coleção genérica
│   │   │       └── configuracoes/page.tsx        # membros da org
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                 # lista de orgs
│   │   │   └── orgs/[orgId]/
│   │   │       ├── colecoes/…  propriedades/…  visualizacoes/…
│   │   │       ├── bin-banco/…  bin-scoring/[assessmentId]/…
│   │   │       ├── min-template/…  usuarios/…  auditoria/…
│   │   ├── api/
│   │   │   ├── orgs/route.ts
│   │   │   ├── orgs/[id]/export/route.ts
│   │   │   ├── orgs/[id]/delete/route.ts
│   │   │   ├── invites/route.ts
│   │   │   ├── invites/accept/route.ts
│   │   │   └── bin/[id]/{score,publish}/route.ts  ·  bin/import/route.ts
│   │   ├── layout.tsx                   # <html>, providers, tema
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/            # shadcn
│   │   ├── shell/  collection/  bin/  min/  program/  charts/  admin/
│   ├── lib/
│   │   ├── supabase/      # server.ts, client.ts, middleware.ts, service.ts
│   │   ├── auth/          # getSession, requireUser, requireRole
│   │   ├── rbac/          # checagens de papel espelhando a RLS
│   │   ├── validation/    # schemas Zod (compartilhados form + api)
│   │   ├── bin/           # cálculo de score médio, agregação de histórico
│   │   ├── collections/   # helpers de data jsonb, filtros, ordenação, fractional index
│   │   └── pdf/           # geração de PDF do dashboard
│   ├── hooks/   stores/   types/   config/ (constantes: áreas, blocos MIN, cores)
├── supabase/
│   ├── migrations/        # 0001_init.sql, 0002_collections.sql, 0003_bin.sql,
│   │                      # 0004_min.sql, 0005_program.sql, 0006_rls.sql, 0007_audit.sql
│   ├── seed/              # min_template_blocks, bin_question_bank inicial, org demo
│   └── config.toml
├── e2e/                   # Playwright
├── middleware.ts
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## 13. STACK, CONVENÇÕES E API

### 13.1 Dependências principais

| Camada          | Libs                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Framework       | `next@15`, `react@19`, `typescript@5`                                                            |
| Dados/Auth      | `@supabase/supabase-js`, `@supabase/ssr`                                                         |
| UI              | `tailwindcss`, `shadcn/ui` (Radix), `lucide-react`, `class-variance-authority`, `tailwind-merge` |
| Tabela/DnD      | `@tanstack/react-table`, `@dnd-kit/core` + `@dnd-kit/sortable`                                   |
| Estado/servidor | `@tanstack/react-query`, `zustand` (UI local)                                                    |
| Formulários     | `react-hook-form`, `zod`, `@hookform/resolvers`                                                  |
| Gráficos        | `recharts`                                                                                       |
| Datas           | `date-fns`                                                                                       |
| PDF             | `@react-pdf/renderer` ou print CSS                                                               |
| Rate limit      | `@upstash/ratelimit` (prod)                                                                      |
| Testes          | `vitest`, `@testing-library/react`, `playwright`                                                 |
| Qualidade       | `eslint`, `prettier`, `typescript` strict                                                        |

### 13.2 Convenções de código

- **TypeScript strict**, sem `any` (usar `unknown` + type guard).
- Componentes **PascalCase**, arquivos **kebab-case**, constantes **SCREAMING_SNAKE_CASE**,
  hooks `useX`.
- Imports absolutos com alias `@/`. Ordem: react/next → libs externas → componentes UI →
  utils/lib → stores/hooks → tipos → css.
- Interface de props explícita para todo componente.
- Server Components por padrão; `'use client'` só quando há estado/efeito/evento.
- Toda leitura de dados sensível passa por `lib/supabase/server.ts` (RLS). `service.ts`
  (service_role) só dentro de `/api` e nunca importado por Client Component.
- `try/catch` com mensagem contextual; `logger.error('Falha ao <op>', { error, contexto })`
  antes de re-lançar.
- Gates de qualidade antes de merge: `lint`, `typecheck`, `test`, `build` verdes; sem issue
  CRITICAL de review.

### 13.3 Contrato de API (Route Handlers)

| Método | Rota                    | Papel                         | Corpo (Zod)                               | Resposta              |
| ------ | ----------------------- | ----------------------------- | ----------------------------------------- | --------------------- |
| POST   | `/api/orgs`             | platform_admin                | `{ name, slug, ownerEmail }`              | `{ org, invite }`     |
| POST   | `/api/invites`          | admin/consultant/client_owner | `{ orgId, email, role }`                  | `{ invite }`          |
| POST   | `/api/invites/accept`   | autenticado                   | `{ token }`                               | `{ membership }`      |
| POST   | `/api/bin/[id]/score`   | consultant/admin              | `{ scores[], kpis, forcas[], alertas[] }` | `{ assessment }`      |
| POST   | `/api/bin/[id]/publish` | consultant/admin              | `{}`                                      | `{ assessment }`      |
| POST   | `/api/bin/import`       | consultant/admin              | formato 7.4                               | `{ imported: {...} }` |
| GET    | `/api/orgs/[id]/export` | admin/consultant              | —                                         | `application/zip`     |
| POST   | `/api/orgs/[id]/delete` | platform_admin                | `{ confirm: slug }`                       | `{ scheduledFor }`    |

### 13.4 Padrão de erro

```json
{
  "error": {
    "code": "VALIDATION_ERROR|FORBIDDEN|NOT_FOUND|CONFLICT|RATE_LIMITED|INTERNAL",
    "message": "descrição legível",
    "details": {}
  }
}
```

HTTP: 400 validação, 401 sem sessão, 403 sem permissão, 404, 409 conflito de estado, 429, 500.

---

## 14. ROADMAP DE CONSTRUÇÃO (épicos → stories)

Seguir story-driven (uma story em `docs/stories/` por item, com acceptance criteria e File List).

### Épico 0 — Fundação

- 0.1 Projeto Supabase (local + staging) + `0001_init.sql` (profiles, orgs, memberships, invites).
- 0.2 Scaffold Next.js + Tailwind + shadcn + estrutura de pastas + tokens do design system.
- 0.3 Auth: login, logout, esqueci/redefinir senha, confirmação de e-mail, `middleware.ts`.
- 0.4 Funções RLS auxiliares + policies base + `0006_rls.sql`.
- 0.5 Shell autenticado: sidebar, topbar, org switcher, tema claro/escuro.
- 0.6 CI: lint/typecheck/test/build + deploy preview Vercel.

### Épico 1 — Motor de Coleções

- 1.1 Schema `collections/properties/select_options/records/views/record_relations`.
- 1.2 CRUD de coleções + workspaces (admin).
- 1.3 CRUD de propriedades (todos os tipos 5.2.1) + gerenciador de opções/cores + reordenar/travar.
- 1.4 `DataTable`: render por tipo, edição inline, adicionar linha, redimensionar/reordenar coluna.
- 1.5 Views: criar/editar, `FilterBuilder`, `SortMenu`, colunas visíveis, agrupamento, view padrão.
- 1.6 `BoardView` (kanban dnd) + `ListView` + `GalleryView` + `CalendarView`.
- 1.7 Propriedade `relation` + `RelationPicker` + lookup reverso.
- 1.8 Anexos (`file`) com Storage + URL assinada.
- 1.9 Painel Admin de coleções/propriedades/visões (seção 10).

### Épico 2 — BIN

- 2.1 Schema `bin_*` (inclui `bin_assessment_areas`) + seed do banco de perguntas (10 áreas).
- 2.2 Admin: editor do banco de perguntas (global + override por org).
- 2.3 Criar assessment → gerar 10 `bin_assessment_areas`. **Hub do BIN** (grid de 10 áreas com
  progresso e status).
- 2.4 Tela de resposta por área: `FormRenderer` por `input_type` + autosave + recálculo de
  `answered_count`/status + "Marcar área como respondida".
- 2.5 "Enviar diagnóstico" (habilita com 10/10) → `draft`→`submitted` + trava de respostas.
- 2.6 Admin: `ScoringForm` (score/diagnóstico por área, KPIs, forças, alertas) + `POST /api/bin/[id]/score`.
- 2.7 `POST /api/bin/import` (formato 7.4) + validação Zod.
- 2.8 Publicação (`/publish`) + gate de visibilidade por status (tabela da seção 7.2).
- 2.9 Dashboard: radar, barras, gauge, KPI cards, findings, accordion por área.
- 2.10 Histórico/evolução (linha) comparando assessments publicados.
- 2.11 Exportar PDF.
- 2.12 **Motor de Reconciliação** (v2.1): schema `bin_evidence` + `bin_findings.kind='inconsistencia'`
  (seção 5.7) · `POST /api/bin/[id]/evidence` (porta `lib/ingestion.js`) ·
  `POST /api/bin/[id]/reconcile` (porta `lib/reconciliation.js`) · inconsistências na `ScoringForm`
  e no dashboard (seção 7.5).

### Épico 3 — MIN

- 3.1 Schema `min_*` + seed dos 13 `min_template_blocks` + perguntas-guia.
- 3.2 Admin: editor do template (títulos/setores/perguntas-guia).
- 3.3 Criar canvas → gerar os 13 blocos (todos liberados).
- 3.4 **Hub do MIN**: `CanvasGrid` (visual da imagem: 3 fases, selo de status, %).
- 3.5 Tela de bloco: `BlockEditor` (perguntas-guia + texto livre + anexos) + autosave +
  `min_block_history` + ajuste de status.
- 3.6 `PhaseProgress` + barra geral X/13.

### Épico 4 — Programa & Tarefas

- 4.1 Schema `programs` + `program_milestones`.
- 4.2 Provisionar coleção `Tarefas` (template 9.1) na criação da org.
- 4.3 `TaskBoard` + views padrão (quadro/tabela/calendário/minhas tarefas).
- 4.4 Página `Programa`: `MilestoneTimeline` + fase atual + CRUD de marcos.
- 4.5 Ligações marco ↔ tarefas ↔ blocos MIN.

### Épico 5 — Segurança & Hardening

- 5.1 `audit_log` + triggers nas tabelas sensíveis + tela de auditoria.
- 5.2 `GET /api/orgs/[id]/export` (LGPD) + `POST /api/orgs/[id]/delete` (carência + anonimização).
- 5.3 Rate limiting + cabeçalhos de segurança + CSP.
- 5.4 Política de Privacidade + Termos + consentimento no cadastro.
- 5.5 Backups: PITR ligado + dump semanal + teste de restauração documentado.
- 5.6 E2E Playwright dos fluxos críticos (login, isolamento de tenant, BIN ponta a ponta, MIN,
  criação de coluna/view, permissão negada).

### Ordem recomendada

`0 → 1 → 2 → 3 → 4 → 5`. Épico 1 é o maior e destrava tudo (BIN dashboard e Tarefas reusam
componentes dele). Épico 5.3/5.4 pode andar em paralelo a partir do Épico 2.

---

## 15. BLOCO CONDENSADO — SYSTEM PROMPT PARA AGENTE DE CÓDIGO (v2.1)

> Copie o texto abaixo como _system prompt_ de qualquer agente que for implementar o PULSO.
> Esta versão substitui a v2.0: reintegra o motor de reconciliação, incorpora a pesquisa de
> mercado (seção 17) e as lições dos dois protótipos descartados (seção 18).

```
Você está construindo o PULSO — a plataforma de inteligência de negócios da Land Grow.
NÃO é BI conversacional. NÃO é só para PME. É uma plataforma web multi-tenant onde empresas
clientes de qualquer porte fazem login e acessam: (a) um workspace estilo Notion com coleções,
campos personalizados, colunas editáveis e múltiplas visualizações, gerenciável pelo admin da
Land Grow; (b) o BIN — formulário de diagnóstico que o cliente responde, evidência opcional por
upload que é cruzada contra as respostas pelo motor de reconciliação, resultado lançado pela Land
Grow, gerando um dashboard visual (radar de maturidade por 10 áreas, scorecards, forças, alertas,
inconsistências, evolução); (c) o MIN — 13 blocos de modelo de negócio em 3 fases (Fundação 1-6,
Operação 7-9, Consolidação 10-13), preenchidos durante o programa; (d) gestor de tarefas
personalizado e planejamento estratégico do programa de aceleração.

FORA DO ESCOPO: IA conversacional, chat com dados, clones de IA, conectores externos
(CRM/Open Finance/Instagram), geração automática de OKR/SMART/5W2H, app mobile, SSO, Gantt/Scrum
no motor de coleções genérico, campos calculados e exploração ad-hoc estilo LookML no dashboard.
Não implemente nada disso — são decisões explícitas (seções 2.2 e 17), não lacunas a preencher.

DENTRO DO ESCOPO (reintegrado v2.1): motor de reconciliação — cruza o declarado no BIN contra
evidência de upload (PDF/Excel/áudio), sem depender de nenhum conector externo. `lib/reconciliation.js`
e `lib/ingestion.js` de um protótipo anterior já implementam a lógica de extração/matching — portar
para Route Handlers, não reescrever do zero.

STACK: Next.js 15 App Router + React 19 + TypeScript strict + TailwindCSS + shadcn/ui (Radix) +
TanStack Table/Query + dnd-kit + Recharts + react-hook-form + Zod. Backend: Supabase
(Postgres com RLS default-deny, Auth email+senha, Storage por org). Deploy Vercel. Route Handlers
/api/* só onde RLS não basta (scoring/publish do BIN, evidência/reconciliação do BIN, convites,
provisionamento de org, export/delete LGPD, import de resultados); service_role só no servidor.

SEGURANÇA (inegociável — ver seção 18, os dois protótipos anteriores falharam exatamente aqui):
RLS em toda tabela de tenant via org_id, desde a primeira migration — NUNCA `using (true)`
"temporário"; se Auth ainda não existe, a tabela fica inacessível até existir. Funções
is_platform_admin(), is_member_of(org), member_role(org). Papéis: platform_admin, consultant
(flags no profile); client_owner/client_member/client_viewer (na membership). Cookies httpOnly via
@supabase/ssr — nunca token, nem chave (nem a anon key) em HTML/JS servido ao cliente sem passar
por env var + build step. Confirmação de e-mail obrigatória. Toda entrada de API validada com Zod.
audit_log com triggers. LGPD: consentimento no cadastro, export e exclusão por org. CSP e security
headers. Rate limiting nos /api. IDs de tenant são sempre uuid do banco — nunca slug/string solta
como chave estrangeira (slug existe só pra URL, é campo à parte).

MODELO DE DADOS (motor de coleções): collections → properties (tipos: text, long_text, number,
currency, percent, select, multi_select, status, date, datetime, checkbox, url, email, phone,
person, relation, file, rating) com select_options; records com data jsonb keyed by property_id
(índice GIN); views (table/board/list/gallery/calendar — sem Gantt/Scrum, ver seção 17.1) com
config jsonb (filters, sorts, visibleProperties, groupBy, widths). BIN: bin_question_bank,
bin_assessments (draft→submitted→scored→published — cliente só vê published), bin_answers,
bin_scores, bin_kpis, bin_findings (kind: forca | alerta | inconsistencia), bin_evidence (upload +
KPIs extraídos). MIN: min_template_blocks (13 fixos, seed), min_canvases, min_blocks,
min_block_history. Programa: programs, program_milestones. Tarefas = coleção sistema
(system_key='tasks').

BIN e MIN têm o MESMO padrão de UX: uma tela "hub" com blocos (10 áreas no BIN, 13 blocos no
MIN), cada um com progresso e status; a pessoa clica num bloco e vai para as perguntas daquele
bloco; autosave; volta ao hub; ordem livre. No BIN, quando as 10 áreas estão respondidas,
habilita "Enviar diagnóstico" (trava respostas → evidência opcional + reconciliação automática →
Land Grow revisa inconsistências e faz scoring → publica → dashboard). No MIN os 13 blocos ficam
todos liberados desde o início, sem trava por fase.

DASHBOARD DO BIN: visuais fixos (radar, gauge, KPI cards, findings, accordion, histórico) — não é
motor de BI genérico (sem campo calculado pelo cliente, sem exploração ad-hoc). Duas coisas da
pesquisa de mercado (seção 17.2) entram sem custo extra: (1) interatividade cruzada — clicar numa
área do radar filtra o accordion de análise pra aquela área; (2) separar cálculo de métrica
(bin_kpis) de componente de visualização no código, mesmo com visuais fixos hoje.

10 ÁREAS CANÔNICAS (BIN e MIN): Estratégico, Financeiro, Comercial/Vendas, Marketing, Operacional,
Administrativo, Pessoas/RH, Liderança, Jurídico, Inovação.

DESIGN: dark por padrão + tema claro. Tokens: --bg #0a0f1e, --surface-1 #111827, --border #26304d,
--text-1 #e8ecf5, --primary #6366f1 (indigo, ações), --brand-lime #b8f000 (Land Grow, realce de
dado/KPI/MIN). Fonte Inter, números tabulares. Raio 6/8/12. Inspiração Notion + Linear: denso,
limpo, teclado-navegável, AA de contraste.

CONVENÇÕES: componentes PascalCase, arquivos kebab-case, imports absolutos @/, sem any,
interface de props explícita, Server Components por padrão, try/catch com logger.error contextual.
Gates antes de concluir: npm run lint, typecheck, test, build — todos verdes (isso pega em build o
tipo de bug de nome de variável trocada que já derrubou um protótipo anterior inteiro).

MÉTODO: story-driven. Uma story por item do roadmap (Épicos 0→5) com acceptance criteria e
File List. Épico 0 (fundação/auth/RLS/shell) → Épico 1 (motor de coleções, o maior) → Épico 2
(BIN, incluindo reconciliação — 2.12) → Épico 3 (MIN) → Épico 4 (Programa/Tarefas) → Épico 5
(hardening/LGPD/e2e). Não invente feature fora deste documento; se faltar definição, pergunte.

REFERÊNCIA: o schema do motor de coleções e a lógica de reconciliação/ingestão de um protótipo
anterior (respectivamente `supabase/migrations/0003_collections_engine.sql` e
`lib/reconciliation.js`/`lib/ingestion.js`) são material de partida válido — portar a lógica,
não o padrão de acesso direto do navegador ao Postgres nem RLS permissiva (ver seção 18).
```

---

## 16. PENDÊNCIAS PARA NAYARA DECIDIR

Resolvidas em 30/08/2026: stack (Next.js + Supabase + Vercel), UX do BIN (área por área),
MIN (13 blocos liberados, mesmo padrão do BIN).

Resolvidas em 11/09/2026: motor de reconciliação reintegrado ao escopo (seções 5.7, 7.5, 17-18);
confirmado migrar a fundação pra Next.js em vez de continuar o protótipo vanilla JS (análise de
código na seção 18 — bug de crash confirmado, RLS permissiva, chave no cliente, ID incompatível
com uuid); schema do motor de coleções e lógica de reconciliação/ingestão do protótipo vanilla
são reaproveitáveis como referência de portagem, não como fundação.

Em aberto:

1. Nome comercial e domínio de produção.
2. Texto das **perguntas-guia** dos 13 blocos do MIN e das **perguntas do BIN** por área
   (banco inicial). — bloqueia os seeds dos Épicos 2 e 3.
3. Quais KPIs entram nos cards do dashboard do BIN (lista da seção 7.3 é proposta).
4. Política de Privacidade / Termos de Uso (texto jurídico) e e-mail do encarregado (DPO).
5. Identidade visual final (logo, se o verde-limão é o tom exato, tipografia de marca).
6. Provedor de e-mail transacional (Supabase default, Resend, SES?).

---

## 17. PESQUISA DE MERCADO — recursos que o PULSO precisa igualar

Pesquisa direta (11/09/2026) nas páginas de produto de Monday.com, Notion, Bitrix24, Power BI e
Looker (Tableau bloqueou o acesso automatizado — coberto por conhecimento geral do produto).
Objetivo: traduzir "estilo Monday/Bitrix/Notion" e "estilo Power BI/Tableau/Looker" — como a
Nayara descreveu o produto — em recursos concretos, não em adjetivo vago.

### 17.1 Motor de Coleções (Plano de Ação) — Monday, Notion, Bitrix24

| Referência     | O que tem                                                                                                                                                                                  | Já coberto na seção 5.2 / a considerar                                                                                                                                                                                                                                                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monday.com** | Views: Kanban, Gantt, Calendário, Timeline. Dashboard agregando dados de vários quadros (progresso, saúde do projeto, disponibilidade de equipe). Automações ("mover card quando X muda"). | Kanban/Calendário já cobertos (`board`/`calendar`). **Gantt e Timeline não estão na lista de `view_type`** — avaliar se `Programa` (seção 9.2, `MilestoneTimeline`) cobre essa necessidade em vez de adicionar Gantt ao motor de coleções genérico (Gantt é caro de construir bem; não duplicar). Automações ficam **fora do MVP** (seção 2.2 já exclui) — mas vale registrar como Fase 2 clara, não esquecida. |
| **Notion**     | Cada registro é uma página completa (propriedades + corpo rich-text + anexos). Conexões com apps externos (Gmail, HubSpot, GitHub, Slack).                                                 | Página-registro já está na spec (seção 5.2, "REGISTRO = PÁGINA"). Conexões com apps externos = mesma categoria de "conectores" já excluída do MVP (seção 2.2) — não reabrir.                                                                                                                                                                                                                                    |
| **Bitrix24**   | Tarefas com Kanban **+ Gantt + Scrum** + lista, rastreamento de tempo. Permissões e papéis centralizados por diretório único de identidade, suporta estrutura de empresa inteira.          | Reforça que papéis/permissões (seção 3) e RLS (seção 6.2) são o núcleo certo a priorizar — Bitrix24 trata isso como fundação, não acessório. Scrum/rastreamento de tempo: fora do MVP, mas registrar como candidato de Fase 2 se o Plano de Ação precisar de estimativa de esforço.                                                                                                                             |

**Decisão a partir da pesquisa:** não adicionar Gantt/Scrum ao motor de coleções genérico no MVP —
o custo de construir bem (dependências entre tarefas, recálculo de datas) não se paga ainda com 1-2
clientes piloto. `Programa` (marcos por mês, seção 9.2) resolve a necessidade real de linha do tempo
sem essa complexidade. Revisitar se um cliente pedir Gantt de verdade.

### 17.2 Dashboard BI — Power BI, Tableau, Looker

| Referência   | O que tem                                                                                                                                                                                                            | Aplicação no PULSO                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Power BI** | Modelo semântico como fundação de relatórios; visuais interativos conectados entre si (clicar num cartão filtra os outros).                                                                                          | O `bin_scores`/`bin_kpis` já funcionam como um modelo semântico simples (seção 5.3). Adicionar **interatividade cruzada** no dashboard do BIN (seção 7.3): clicar numa área no radar filtra o accordion de análise pra aquela área — não é feature nova, é comportamento que os componentes já planejados (`RadarChart`, `AreaAnalysisAccordion`) devem ter desde o início, sem custo extra de schema.                                                 |
| **Tableau**  | Worksheets viram Dashboards por composição (arrastar cada worksheet como objeto). Campos calculados. Filtros e Parâmetros como controles do dashboard. "Show Me" sugere o tipo de visual certo pro dado selecionado. | O dashboard do BIN já é composição de componentes fixos (radar + barras + KPIs + findings) — não precisa de "worksheets" genéricos no MVP. **Campos calculados**: fora de escopo agora (seria dar ao cliente o poder de criar métrica própria) — registrar como ideia de Fase 2 se fizer sentido pro admin, não pro cliente final.                                                                                                                     |
| **Looker**   | LookML: `dimension`/`measure`/`relationship` como camada semântica versionada. Explores → Looks salvos → Dashboards. Drill-down e pivot tables self-service.                                                         | O MVP não precisa de uma linguagem de modelagem própria (LookML) — over-engineering pra 1-2 clientes. Mas o _conceito_ (separar "métrica" de "visualização") já está implícito em `bin_kpis` (métrica) vs. os componentes de chart (visualização) — manter essa separação explícita no código (não hardcodar cálculo de métrica dentro de componente de gráfico) deixa o caminho aberto pra um "Looker interno" mais tarde, sem reescrever nada agora. |

**Decisão a partir da pesquisa:** o dashboard do BIN não precisa de motor de BI genérico
(campos calculados, exploração ad-hoc, LookML) no MVP — isso é featureset de ferramenta de BI
horizontal, e o PULSO é vertical (10 áreas fixas, KPIs fixos). O que vale adotar sem custo extra:
**interatividade cruzada** entre os visuais já planejados (clique filtra) e **separar métrica de
visualização** no código, mesmo que hoje só existam os visuais fixos da seção 7.3.

---

## 18. LIÇÕES DE DOIS PROTÓTIPOS DESCARTADOS — não repetir

Dois protótipos foram construídos e descartados como fundação (mantidos só como referência de
design/fluxo) antes desta v2.1: um gerado no **Google AI Studio** (React solto, auditado em
`AUDITORIA-FRONT-GOOGLE-AI-STUDIO.md`) e um em **vanilla JS** (auditado em código, sessão de
11/09/2026). Os dois, independentemente, caíram nos mesmos erros — por isso viram regra, não nota
de rodapé.

| Erro repetido nos dois protótipos                                                                                                                             | Regra pra este build                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autorização decidida só no cliente (`effectiveRole` no React context; RLS `using (true)` no vanilla)                                                          | RLS real (seção 6.2) é a **única** fonte de verdade de permissão, desde a primeira linha de schema. Nunca escrever uma policy `using (true)` "temporariamente" — se Auth ainda não existe, a tabela fica inacessível até existir, não aberta a todo mundo. |
| Chave/segredo acessível do navegador (`GEMINI_API_KEY` no bundle do AI Studio; `SUPABASE_ANON_KEY` inline no `index.html` do protótipo vanilla)               | Nenhuma chave — nem a `anon key` — em HTML/JS servido ao cliente sem passar por env var + build step. Toda chamada sensível passa por Route Handler (seção 4.1, 6.3).                                                                                      |
| Navegação _stringly-typed_ sem URL real (`onNavigate('admin')` no AI Studio; hash router `#/kanban` no vanilla)                                               | Next.js App Router com rotas de arquivo (seção 12) desde o Épico 0 — não existe versão "provisória" de roteamento neste projeto.                                                                                                                           |
| "God context" / estado global misturando tema, sessão e dados (`useApp()` com 12 responsabilidades no AI Studio)                                              | Separar por design desde o início: `ThemeProvider`, sessão via `@supabase/ssr`, dados via `@tanstack/react-query` — nunca um contexto único (seção 4.1, 13.1).                                                                                             |
| Bug de nome de variável não pego antes de rodar (`responsavelProp` vs. `responsableProp` no protótipo vanilla — crash garantido em toda renderização de card) | `typescript strict` + `eslint` com `no-undef`/`no-unused-vars` bloqueiam merge (seção 13.2, gates da seção 14). Isso é exatamente o tipo de erro que TypeScript pega em tempo de build e JS solto não pega nunca.                                          |
| Estado de cliente identificado por string solta incompatível com o schema (`'jefferson'` como `cliente_id` contra coluna `uuid`)                              | IDs de tenant são sempre `uuid` gerado pelo banco (`orgs.id`, seção 5.1) — nunca slug ou string de conveniência usada como chave estrangeira. `slug` existe só para URL amigável, é campo à parte.                                                         |

**Conclusão prática:** os dois protótipos continuam válidos como **referência visual e de fluxo**
(o design system §11 do AI Studio já bate com a spec; o schema do motor de coleções do protótipo
vanilla — seção 5.2 — é diretamente reaproveitável). Nenhum dos dois é reaproveitável como
**fundação de código** — a Next.js é construída do zero sobre a spec, usando os dois como
referência, não como ponto de partida a "consertar por cima".

---

_Land Grow · PULSO v2.1 · especificação-mestra do MVP · 11/09/2026_
