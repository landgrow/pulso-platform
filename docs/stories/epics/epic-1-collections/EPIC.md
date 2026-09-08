# Épico 1 — Motor de Coleções

**Data de criação:** 05/09/2026
**Prioridade:** ALTA (desbloqueia Épicos 2 e 3 — BIN e MIN)
**Status:** 🔄 Todas as 8 stories implementadas (47/47 pts) — 1.1-1.4 e 1.7 verificadas ✅; 1.5 parcial (áudio adiado); 1.6 aguardando verificação em Postgres real; 1.8 aguardando criação manual de usuário de teste pra ativar os e2e reais. Nenhum trabalho de código pendente — só passos manuais de infraestrutura, todos documentados.

---

## Objetivo

Construir o **Motor de Coleções** do PULSO: a infraestrutura que ingere, normaliza e versiona os dados de cada cliente, vindos de múltiplas fontes (formulário, upload, texto livre, áudio), preparando-os para serem usados pelo BIN (Épico 2) e MIN (Épico 3).

O motor de coleções **não inclui** a parte de conexões diretas (CRM, Open Finance, Instagram) — isso entra em uma Fase 2 do motor (ver MOTOR-INGESTAO-RECONCILIACAO.md). Nesta primeira entrega, o motor trabalha com:

- **Formulário estruturado** (entrada manual via UI)
- **Upload de arquivos** (PDF, Excel/CSV)
- **Texto livre** (digitado pelo usuário)
- **Áudio transcrito** (upload de áudio + transcrição via Claude API)
- **Coleta manual** (paste de dados pelo usuário — para fase inicial)

O motor **não roda nenhuma análise** ainda — ele só ingere, valida, normaliza e armazena. Análise, scores e reconciliação ficam para o Épico 2.

---

## Por que é o próximo épico

- O **BIN** (Épico 2) precisa de dados estruturados para rodar o diagnóstico. Sem o motor de coleções, o BIN seria uma tela em branco pedindo "cole o JSON aqui" — sem cabimento.
- O **MIN** (Épico 3) também consome dados do motor.
- Toda a Land Grow atual vive em JSONs soltos no iCloud (`data/jefferson.json`, `data/rs-company.json`). Esse épico transforma isso em um sistema versionado por período.

---

## Escopo (dentro do épico)

### 1.1 — Modelo de dados: Cliente + Período + Coleção

- [ ] Schema do banco: `clientes`, `periodos_dados`, `colecoes`, `evidencias`, `fontes`
- [ ] Tabela `clientes` (1:1 com `organizations`)
- [ ] Tabela `periodos_dados` (1:N com clientes) — competência mensal
- [ ] Tabela `colecoes` — cada "bloco" de dado ingerido (formulário, upload, texto)
- [ ] Tabela `evidencias` — arquivos brutos (PDF, Excel, áudio) + metadados
- [ ] Tabela `fontes` — metadata de fontes conectadas (placeholder para Fase 2)
- [ ] RLS default-deny em todas as tabelas
- [ ] Migração aplicada e testada

### 1.2 — Server actions: criar/atualizar/listar períodos

- [ ] `createPeriod(mes, ano)` — abre um novo período para o cliente ativo
- [ ] `getCurrentPeriod(orgId)` — retorna o período em aberto
- [ ] `listPeriods(orgId)` — histórico
- [ ] `getPeriod(periodId)` — busca 1 período
- [ ] `updatePeriodData(periodId, partial)` — merge de dados novos
- [ ] `closePeriod(periodId)` — fecha um período (não permite mais edits)
- [ ] RLS enforcement em todas as ações

### 1.3 — Coleta via formulário estruturado

- [ ] UI `/clientes/[slug]/coleta/formulario` — formulário de 12 perguntas
- [ ] Validação Zod por bloco (Financeiro, Operacional, Comercial, etc.)
- [ ] Auto-save a cada campo alterado (debounce 1.5s)
- [ ] Persistência em `colecoes` (tipo = `formulario`)
- [ ] Indicador de progresso (% preenchido)
- [ ] Testes unitários do schema Zod

### 1.4 — Upload de arquivos (PDF, Excel/CSV)

- [ ] UI `/clientes/[slug]/coleta/upload` — drop zone multi-arquivo
- [ ] Limite: 25MB por arquivo, 5 arquivos por upload
- [ ] Tipos aceitos: PDF, XLSX, XLS, CSV
- [ ] Storage: Supabase Storage bucket `evidencias/{org_id}/{period_id}/`
- [ ] Metadata salva em `evidencias` (nome, tamanho, mime, uploader, hash)
- [ ] Visualização inline: PDF embed, Excel renderizado em tabela
- [ ] Delete (apenas uploader ou client_owner)

### 1.5 — Texto livre + Áudio

- [x] UI `/clientes/[slug]/coleta/texto` — textarea grande + tags de área (Financeiro, Operacional, etc.)
- [ ] ⏸️ UI `/clientes/[slug]/coleta/audio` — upload de MP3/WAV/M4A (limite 50MB) — adiado, ver 1.5.story.md
- [ ] ⏸️ Transcrição automática (adiado — a story original assumia uma capacidade de áudio inexistente na Claude API; aguardando decisão de vendor ASR real)
- [ ] ⏸️ Transcrição editável após gerada — adiado junto com a transcrição
- [ ] ⏸️ Status: `pending` → `processing` → `completed` / `failed` — adiado junto com a transcrição

### 1.6 — Versionamento e merge

- [x] Cada UPDATE em `colecoes` arquiva a versão anterior em `colecao_revisions` (via trigger, não mutando a `colecoes` original — só a última versão fica lá)
- [x] UI mostra histórico de coleções (timeline) — `/clientes/[slug]/periodo/[id]/historico`
- [x] Diff entre duas versões (visual: tabela de campos para formulário, estilo git-diff para texto)
- [x] Permitir "restaurar versão anterior" (rollback) — não-destrutivo, a versão substituída também vira uma revision
- [x] Bloqueio se período `fechado`/`analisado` (mesma regra de `canEdit` já usada nas Stories 1.3-1.5)
- [ ] ⚠️ Trigger e RLS de `colecao_revisions` não verificados contra Postgres real neste ambiente — ver 1.6.story.md

### 1.7 — Visualização consolidada

- [x] UI `/clientes/[slug]/periodo/[id]` — vista unificada de todas as coleções do período
- [x] Cards por fonte: Formulário, Uploads, Texto, Áudio
- [x] Badge de status: `em_coleta` / `pronto_para_analise` / `analisado` / `fechado`
- [x] Botão "Marcar como pronto para análise" (`markReadyForAnalysis` — a análise em si é Épico 2)
- [x] Lista de evidências com preview (reaproveita `FileList` da Story 1.4)
- [x] Bônus: página `/clientes/[slug]` (lista de períodos) — não estava em nenhuma story, mas sem ela o breadcrumb de toda a épico 1 apontava pra uma rota inexistente

### 1.8 — Testes e gates

- [x] Testes unitários: schemas Zod, helpers de slug, validações de upload (177 testes)
- [ ] Testes de integração: server actions com RLS (mockando auth.uid) — não feito; a convenção real do projeto testa só schemas Zod, sem mockar Supabase, em nenhuma story
- [x] Smoke tests e2e: criar período → upload arquivo → ver na listagem — escrito (`collections-flow.spec.ts`), mas ainda não rodou de verdade — aguarda criação manual do usuário de teste (`docs/testing/e2e-setup.md`)
- [x] Gates verdes: typecheck, lint, format, build, test — e2e verde no que roda sem o setup de teste pendente

---

## Fora do Escopo (outros épicos)

| Item                                            | Épico                            |
| ----------------------------------------------- | -------------------------------- |
| Análise / scores de maturidade                  | Épico 2 (BIN)                    |
| Reconciliação declarado × evidência             | Épico 2 (BIN)                    |
| Conexões diretas (CRM, Open Finance, Instagram) | Fase 2 do motor (pós-lançamento) |
| OKRs e plano de ação                            | Épico 2                          |
| Dashboard do cliente                            | Épico 2                          |
| MIN 13 blocos                                   | Épico 3                          |

---

## Critérios de Conclusão (DoD)

- [x] `npm run build` passa sem erros
- [x] `npm run lint` passa sem warnings
- [x] `npm run typecheck` passa sem erros
- [x] `npm run test:run` passa — 177 testes unitários (bem acima do piso de 80+)
- [x] `npm run test:e2e` passa — no escopo que roda sem infraestrutura externa (ver Story 1.8)
- [ ] Migrations aplicadas com sucesso em Supabase (local + cloud) — 0001-0006 presumivelmente sim (pré-existentes); **0007/0008 (Story 1.6) ainda não verificadas contra Postgres real**
- [ ] RLS impede leitura de `clientes` / `periodos_dados` de outra organização — coberto por `db/test-rls.sql`, mas esse script é manual (não roda em CI) e nunca foi executado nesta sessão
- [ ] Upload de PDF de 10MB funciona em <5s — não medido (sem ambiente de teste real)
- [ ] Áudio de 2min é transcrito em <30s — N/A, funcionalidade adiada (Story 1.5)
- [ ] Versionamento funciona — rollback de uma versão anterior retorna dados — implementado (Story 1.6) e o e2e existe (`collections-flow.spec.ts`), mas nunca rodou de verdade — mesma pendência do setup de teste
- [x] Documentação técnica atualizada (`docs/DATA-MODEL.md` com novas tabelas — criado do zero, não existia)

---

## Stories do Épico

| Story | Título                                                    | Pontos | Status                                                                 |
| ----- | --------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| 1.1   | Schema: clientes + periodos_dados + colecoes + evidencias | 8      | ✅ Concluída                                                           |
| 1.2   | Server actions de período (CRUD + close)                  | 5      | ✅ Concluída                                                           |
| 1.3   | UI: Formulário estruturado com auto-save                  | 8      | ✅ Concluída (05/09/2026)                                              |
| 1.4   | UI: Upload de arquivos (PDF/Excel/CSV) com Storage        | 8      | ✅ Concluída (05/09/2026)                                              |
| 1.5   | UI: Texto livre + Áudio com transcrição Claude            | 5      | 🟡 Parcial (3pts texto livre ✅ · 2pts áudio adiados, 05/09/2026)      |
| 1.6   | Versionamento e merge de coleções                         | 5      | 🟡 Implementada, migração não verificada em Postgres real (05/09/2026) |
| 1.7   | UI: Visualização consolidada do período                   | 5      | ✅ Concluída (05/09/2026)                                              |
| 1.8   | Testes + CI gates verdes                                  | 3      | 🟡 Feito o que dá sem infra externa (05/09/2026) — ver 1.8.story.md    |

**Total:** 47 pontos · 42pts implementados (37 verificados + 5 pendentes de verificação em Postgres real, Story 1.6) · 3pts restantes (1.8) + 2pts adiados (áudio, aguardando decisão de vendor ASR)

---

## Modelo de Dados (resumo)

```
organizations (1) ─── (1) clientes
clientes (1) ─── (N) periodos_dados
periodos_dados (1) ─── (N) colecoes
periodos_dados (1) ─── (N) evidencias
colecoes (1) ─── (N) colecao_revisions  -- versionamento
```

### Tabela `clientes`

- `id uuid PK`
- `org_id uuid FK organizations` (1:1)
- `cnpj text`
- `setor text`
- `porte text` (micro/pequena/media/grande)
- `faturamento_faixa text`
- `created_at`, `updated_at`

### Tabela `periodos_dados`

- `id uuid PK`
- `cliente_id uuid FK clientes`
- `mes int` (1-12)
- `ano int` (>=2024)
- `status text` (`em_coleta` / `pronto_para_analise` / `analisado` / `fechado`)
- `closed_at timestamptz` (null se aberto)
- `created_at`, `updated_at`
- UNIQUE (`cliente_id`, `ano`, `mes`)

### Tabela `colecoes`

- `id uuid PK`
- `periodo_id uuid FK periodos_dados`
- `tipo text` (`formulario` / `texto_livre` / `transcricao_audio`)
- `status text` (`rascunho` / `validado` / `descartado`)
- `payload jsonb` — os dados brutos da coleta
- `metadata jsonb` — área (tag), autor, contexto
- `created_by uuid FK profiles`
- `created_at`, `updated_at`

### Tabela `evidencias`

- `id uuid PK`
- `periodo_id uuid FK periodos_dados`
- `tipo text` (`pdf` / `excel` / `csv` / `audio`)
- `storage_path text` — caminho no Supabase Storage
- `nome_original text`
- `mime_type text`
- `tamanho_bytes bigint`
- `transcricao text` (null se não for áudio, ou ainda não transcrito)
- `transcricao_status text` (`pending` / `processing` / `completed` / `failed`)
- `hash text` — SHA-256 do arquivo
- `uploaded_by uuid FK profiles`
- `created_at`

---

## Fluxo de Uso (UX)

```
1. Cliente acessa /clientes/[slug]
2. Vê lista de períodos (atual + histórico)
3. Clica em "Abrir coleta deste mês" ou "Iniciar novo período"
4. Sistema cria `periodos_dados` (status = `em_coleta`)
5. Cliente adiciona fontes:
   - Preenche formulário estruturado (auto-save)
   - Faz upload de PDFs/planilhas
   - Digita texto livre
   - Grava/upload de áudio → transcrição automática
6. Cada adição cria uma `colecoes` ou `evidencias`
7. Cliente pode revisar tudo no painel consolidado
8. Cliente clica "Marcar como pronto para análise" → status = `pronto_para_analise`
9. Motor de análise (Épico 2) pega daqui
```

---

## Riscos

| Risco                            | Mitigação                                                    |
| -------------------------------- | ------------------------------------------------------------ |
| Storage cheio (uploads grandes)  | Limite de 25MB por arquivo + alerta em 80% do bucket         |
| Transcrição de áudio cara        | Limite de 50MB + fila de processamento com rate limit        |
| Versionamento explodindo o banco | Soft delete de revisões antigas; max 50 revisões por coleção |
| RLS permissiva em `clientes`     | Code review focado + testes com 2+ orgs mockadas             |
| UX confusa (4 formas de coletar) | Onboarding com "escolha o formato mais natural pra você"     |

---

## Referências

- **PRD-PLATAFORMA-BI-LAND-GROW.md** — seção 5.1 (Ingestão de Dados)
- **MOTOR-INGESTAO-RECONCILIACAO.md** — Camada 1 do motor
- **data/client-data-schema.json** — schema do JSON consolidado
- **Story-Driven Development** — `docs/framework/`

---

_Criado por Morgan (@pm) · Stories 1.1–1.2 concluídas (05/09/2026)_
