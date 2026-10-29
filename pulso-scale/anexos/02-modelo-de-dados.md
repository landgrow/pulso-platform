# Anexo 02 — Modelo de dados alvo (PULSO Scale)

Não executar estas tabelas agora. São o desenho para as migrations da onda correspondente. RLS: default-deny + `FORCE ROW LEVEL SECURITY`. FK por `org_id` UUID, nunca slug.

Convenção: reutilizar tabelas atuais (`organizations`, `memberships`, `boards`, `meetings`, `evidencias`, …) como origem. As tabelas abaixo são o **tecido**, não um segundo CRM.

## Extensão

```sql
create extension if not exists vector;
```

Dimensão de embedding: fixar na onda 0 (ex. 1536) e gravar `embedding_model` em cada chunk. Não misturar modelos no mesmo índice sem coluna de versão.

## `org_modules` (onda 1, pode nascer na 0)

| Coluna | Tipo | Notas |
| --- | --- | --- |
| org_id | uuid FK | PK composta |
| module | text | `estrategia` `comercial` `operacao` `financeiro` `conhecimento` `conversa` `conselho` `pessoas` |
| mode | text | `nativo` \| `espelho` |
| enabled | boolean | default false até GO |
| settings | jsonb | limiares comerciais, tetos |
| updated_at | timestamptz | |

PK `(org_id, module)`. Check: financeiro `enabled` no cliente exige flag explícita de produto (hoje: não).

## `membership_scopes` (onda 1)

| Coluna | Tipo | Notas |
| --- | --- | --- |
| user_id | uuid | |
| org_id | uuid | |
| altitude | text | `direcao` \| `gestao` \| `operacional` |
| modules | text[] | subconjunto dos ligados |
| drill_ops | boolean | default false; auditar mudança |
| granted_by | uuid | |
| granted_at | timestamptz | |

UNIQUE `(user_id, org_id)`. HQ: uma linha por par consultor–org cliente.

## `canonical_entities` (onda 0–2)

Ponteiro estável para retrieve e webhook.

| Coluna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| org_id | uuid | |
| type | text | `deal` `task` `meeting` `document` `diagnosis` `message` `ledger_line` `person` `account` |
| source | text | `pulso` `webhook` `sync` `upload` |
| native_table | text | nullable — `board_cards`, `meetings`, … |
| native_id | uuid | nullable |
| external_id | text | nullable — `pipedrive:123` |
| module | text | |
| altitude_min | text | mínima para ler o cru (`operacional` default) |
| label | text | título seguro para gestão |
| data | jsonb | payload canônico **já mapeado** (sem secret) |
| deleted_at | timestamptz | |

UNIQUE `(org_id, source, external_id)` onde external_id not null. UNIQUE `(org_id, native_table, native_id)` onde native_id not null.

## `integration_connections`

Estender `workspace_integrations` (0030) **ou** tabela nova se o shape atual for só saída. Campos mínimos:

| Coluna | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| org_id | uuid | |
| kind | text | `webhook_in` `pipedrive` `hubspot` `rdstation` `gmail` `generic` |
| direction | text | `in` \| `out` \| `both` |
| status | text | `active` `paused` `error` |
| secret_hash | text | nunca o valor |
| hmac_header | text | default `X-Pulso-Signature` |
| mapper_version | int | |
| last_event_at | timestamptz | |
| created_by | uuid | |

Chave em claro só na resposta de criação (uma vez).

## `integration_events` (onda 2)

| Coluna | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| connection_id | uuid | |
| org_id | uuid | |
| provider_event_id | text | |
| idempotency_key | text | |
| type | text | `deal.updated`, … |
| payload | jsonb | cru, acesso HQ/gestão técnica, **não** vai inteiro ao chat |
| status | text | `received` `mapped` `failed` `ignored` |
| error | text | |
| canonical_id | uuid | |
| received_at | timestamptz | |

UNIQUE `(connection_id, provider_event_id)`. UNIQUE `(connection_id, idempotency_key)` onde key not null.

## `intelligence_events` (onda 0)

Log de “algo mudou, indexe”.

| Coluna | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| org_id | uuid | |
| module | text | |
| altitude | text | do fato, não do leitor |
| entity_id | uuid | canonical ou nativo |
| op | text | `upsert` `delete` |
| processed_at | timestamptz | |

## `intelligence_chunks` (onda 0)

| Coluna | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| org_id | uuid | |
| module | text | |
| altitude_min | text | corte no retrieve |
| source_type | text | |
| source_id | text | |
| canonical_id | uuid | |
| content | text | já minimizado (sem PII extra) |
| embedding | vector(n) | |
| embedding_model | text | |
| token_count | int | |
| tsv | tsvector | FTS pt |
| tombstone | boolean | |
| updated_at | timestamptz | |

Índices: `(org_id, module, altitude_min)`, GIN `tsv`, HNSW/IVFFlat `embedding`. RLS: `can_access_org` **e** função `can_read_altitude(org_id, altitude_min)`.

## `intelligence_runs`

Jobs (index, insight, cluster). `status`, `kind`, `org_id`, `error`, `started_at`, `finished_at`, `stats jsonb`.

## `signals` (onda 3)

| Coluna | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| org_id | uuid | |
| kind | text | `conversion.leak` `cs.silence` `reconcil.gap` |
| module | text | |
| altitude_min | text | direção pode ler síntese; ops vê ação |
| title | text | linguagem do gestor |
| thesis | text | |
| sources | jsonb | `[{type,id}]` obrigatório, min 1 |
| window | daterange | |
| created_at | timestamptz | |
| dismissed_at | timestamptz | |

Sem fonte → constraint CHECK `jsonb_array_length(sources) >= 1`.

## `conversation_records` / `transcripts` (onda 3)

Metadados de e-mail/transcrição: `org_id`, `occurred_at`, `channel`, `external_id`, `participants` (ids internos se houver), `canonical_id`. Corpo completo no Storage ou coluna com RLS dura. `transcripts.meeting_id` FK para `meetings` quando existir.

PII: não guardar BCC; mascarar CPF se o parser achar; retenção Q6.

## Projeções (onda 1)

- `v_dir_org_health(org_id)` — contagens, flags BIN, signals de direção  
- `v_mgmt_funnel(org_id)` — etapas, tempos, sem dono de linha se política pedir  
- `v_ops_queue(org_id, user_id)` — cards/deals da pessoa  

Revogar SELECT direto em `board_cards` para quem só tem `direcao`.

## O que não se duplica

Não copiar `board_cards` para `deals` se o modo for nativo: `canonical_entities` aponta. Espelho: canonical é a linha; board nativo comercial desligado.
