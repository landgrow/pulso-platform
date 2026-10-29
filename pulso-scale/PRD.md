# PRD: PULSO Scale

**Status:** Rascunho — aguarda aprovação de Nayara  
**Versão:** 1.0  
**Data:** 28/10/2026  
**Autor:** produto (com base no briefing de Nayara + estado real do código)  
**Stakeholders:** Nayara (decisão), Cândido (operação HQ), engenharia  
**Fonte da verdade deste pacote:** pasta `pulso-scale/`  
**Não implementar** até existir epic com GO.

| Controle | Valor |
| --- | --- |
| Produto | PULSO |
| Iniciativa | Escala: tecido de inteligência + integrações + comercial + software |
| Superfícies atuais | HQ `/admin`, portal `/clientes/[slug]`, chat `/api/chat` |
| Stack atual | Next.js 16.3 App Router, React 19, TS strict, Tailwind + shadcn, Supabase (Postgres + RLS + Auth + Storage), Vercel, Groq/xAI |
| Relacionados | `docs/produto/PRD-PLATAFORMA-BI-LAND-GROW.md` (jul/2026, SPA — histórico), `docs/produto/ARQUITETURA-SISTEMA.md`, `docs/produto/MOTOR-INGESTAO-RECONCILIACAO.md`, `docs/DATA-MODEL.md`, `docs/lancamento/CUSTOS.md` |

### Changelog

| Versão | Data | O que mudou |
| --- | --- | --- |
| 0.1 | 28/10/2026 | Mapa curto em `docs/produto/PRD-PULSO-ESCALA.md` |
| 1.0 | 28/10/2026 | PRD completo neste pacote: personas, histórias, requisitos, métricas, NFRs, lançamento, anexos |

---

## 0. Como ler

- **Nayara:** §§1–9, 12 (P0), 27–30. O restante é para quem for construir.
- **Engenharia:** anexos 01–05, 07–08 + §§19–24.
- **Design:** anexo 06 + §§11, 17–18.
- Cada requisito tem ID (`REQ-…`). História tem ID (`US-…`). Critério de aceite em Given/When/Then.
- Onde não há métrica medida hoje, a baseline está marcada **não medido** — a onda 0 inclui instrumentar, não chutar número.

---

## 1. Press release interno (antes do spec)

**Título:** O PULSO passa a ser o cérebro do negócio — sem pedir que o cliente abandone o CRM.

A Land Grow senta do lado da PME. O gargalo não é falta de opinião: é o dado espalhado (planilha, ERP, WhatsApp, BIN no PULSO, kanban, reunião) e a Nayara cruzando isso na cabeça. O cliente já tem ferramenta. Recadastrar mata a adoção.

Com o Scale, o PULSO lê o que a empresa já usa (API/webhook), cruza com BIN, MIN, tarefas, documentos e conversas, e devolve estratégia e próxima ação no chat, no painel e no celular. Direção, gestão e operação vêem altitudes diferentes do **mesmo** fato. Inteligência comercial lê funil, e-mail e transcrição e aponta vazamento e risco de CS — com fonte, sem inventar culpado.

Se não der para citar a evidência, o PULSO não afirma. Esse é o produto.

---

## 2. Problem statement

O PULSO hoje é um **sistema web de operação** (HQ Land Grow + portal do cliente) com módulos que quase não se cruzam. O chat da Central IA cola um dossiê truncado (~7 mil caracteres: BIN + 8 reuniões + 16 tarefas + 6 objetivos) e **não lê** Sala, documentos, CRM, financeiro, e-mail nem transcrição. Integrações existentes são sobretudo **saída** (avisar e-mail/webhook), não **entrada** canônica de CRM/ERP.

Quem sente:

| Quem | Frequência | Custo de não resolver |
| --- | --- | --- |
| Fundador PME (ICP Land Grow) | Toda decisão de semana | Continua no feeling; PULSO vira “mais uma tela” |
| Gerente comercial / CS | Diário | Funil no CRM, conversa no e-mail, combinado na reunião — ninguém cruza |
| Equipe Land Grow | Cada cliente ativo | Nayara é o join humano; teto ~8–10 contas simultâneas sem contratar |
| Operação do cliente | Diário | Recadastrar card que já existe no Pipedrive |

**Evidência (honesta):**

- **Briefing de produto (28/10/2026, Nayara):** PULSO como coração; API/webhook para ferramentas que o cliente já usa; BIN, MIN, kanban, Sala, documentos e chat têm que se conversar; módulo de inteligência comercial (CRM, e-mails, conversas, transcrições → CS, suporte, conversão); caminho de web → software → app.
- **Código (`src/lib/inteligencia/org-context.ts`, `src/app/api/chat/route.ts`):** dossiê clipado; prompt já manda “não invente”; não há retrieve.
- **Catálogo (`src/lib/integrations/catalog.ts`):** webhook é *o PULSO chama uma URL sua*. Não há inbox assinado.
- **Carteira (qualitativo, não NPS):** JS Construtora (estruturação comercial + dívida), RS Company (retenção + inadimplência), Ontech (escala comercial). Os três já operam fora do PULSO no comercial/financeiro.
- **Não temos** taxa de uso do chat, tempo até insight, nem tickets de “o PULSO não lê meu CRM”. Instrumentar isso é P0 da onda 0, não um número inventado aqui.

---

## 3. Por que agora

- O PULSO HQ já existe (Sala, boards, BIN, MIN, RLS 0052). Expandir sobre chão real, não sobre SPA/localStorage de jul/2026.
- Janela: BI conversacional genérico (Power BI Copilot etc.) chega nas PMEs; o diferencial Land Grow é **método + evidência + altitude**, não o gráfico.
- Se esperarmos “depois que o HQ ficar perfeito”, o tecido nunca nasce: cada módulo novo vira mais um silo.

Se esperarmos 6 meses: mais telas, mesmo chat cego, mesma Nayara no meio.

---

## 4. Visão e posicionamento

> O PULSO é o cérebro do negócio: recebe fato de qualquer ferramenta que a empresa já use, cruza com o que a Land Grow diagnosticou, e devolve estratégia, insight e próxima ação — no chat, no painel e no celular — sem inventar o que não está na evidência.

**Para o cliente:** “Você continua no CRM/ERP que já tem. O PULSO lê, cruza e diz o que fazer.”  
**Para a Land Grow:** o mesmo software atende HQ e carteira, com altitude e módulo por acesso.

**Não é:** Power BI, CRM novo, ERP, três planos pagos, clone de Graphify, score 0–100 ao vivo.

**É:** uma plataforma, três altitudes, módulos ligáveis (`nativo` ou `espelho`), uma camada de inteligência.

### North star

**% de perguntas no chat (e de signals publicados) que citam ≥ 2 fontes reais e passam o autocheck de causalidade.**

Se o número de telas sobe e esse índice não, o Scale falhou.

---

## 5. Goals e métricas

Alvos abaixo assumem a onda correspondente **já em produção em pelo menos 3 orgs cliente** (além da org interna). Baseline “não medido” = criar evento na onda 0.

### 5.1 Objetivos de usuário

| ID | Goal | Métrica | Baseline | Alvo | Janela |
| --- | --- | --- | --- | --- | --- |
| G1 | Tudo conversa | % respostas do chat com ≥ 2 citações resolvíveis (id de fonte existente) | não medido | ≥ 70% das respostas que afirmam fato | 30 dias pós onda 0 |
| G2 | Sem recadastro | Tempo do webhook aceito até entidade no índice | n/a | < 5 min p95 | onda 2 |
| G3 | Camadas não misturam | Tentativas de direção ler linha operacional (API + retrieve) = 0 em teste IDOR | n/a | 0 vazamento em suite | onda 1 |
| G4 | Comercial com evidência | % signals comerciais com ≥ 1 fonte `deal`/`email`/`transcript` | 0 | 100% | onda 3 |
| G5 | Software, não só site | % usuários ativos semanais que abriram PWA ou app | 0 | ≥ 20% da equipe HQ | 60 dias pós onda 4 |

### 5.2 Objetivos de negócio

| ID | Goal | Métrica | Baseline | Alvo | Janela |
| --- | --- | --- | --- | --- | --- |
| B1 | Nayara deixa de ser o join | Horas/semana de cruzamento manual (auto-reporte) | qualitativo alto | −50% na carteira piloto | 90 dias pós onda 0–2 |
| B2 | Adoção sem trocar ferramenta | Orgs piloto com ≥ 1 conector `espelho` ativo | 0 | 2 de 3 contas ativas | onda 2 |
| B3 | Custo previsível | Custo variável IA+áudio / org / mês | Groq ~0 | teto configurado; alerta em 80% | onda 3 |
| B4 | Não vender plano | `organizations.plan` não aparece em UI/comercial | coluna legado existe | 0 menção a Starter/Pro/Enterprise | contínuo |

### 5.3 Leading vs lagging

**Leading (dias–semanas):** taxa de citação, p95 ingest, erros 4xx/5xx da API v1, % retrieve vazio, adoção do hub de eventos.  
**Lagging (90 dias):** retenção da conta piloto, horas de cruzamento, tickets “o chat inventou”, custo/org.

**Como medir:** eventos `intel.chat_turn`, `intel.citation`, `intel.ingest_acked`, `intel.signal_published` (ver §25). Sem evento, a métrica não existe.

---

## 6. Non-goals (Won't this time)

| Não faz | Por quê | Revisitar se |
| --- | --- | --- |
| Três planos pagos | Decisão de produto vigente; `plan` no banco é legado | Nayara abrir comercial SaaS |
| Financeiro no menu do cliente | Omie/HQ permanece; 0031 não se aplica | Nayara autorizar módulo financeiro cliente |
| Score BIN 0–100 ao vivo em reunião | Rejeitado explicitamente | Pedido escrito em contrário |
| Clonar Graphify no repo | Grafo é ferramenta de engenharia, não produto | — |
| Microserviços / Kafka / Elasticsearch no começo | Time não sustenta; Postgres + pgvector basta | p95 retrieve > 1,5 s em 50 orgs |
| Open Finance, Instagram, WhatsApp Business API no v1 | Escopo e compliance | Depois do inbox CRM estável |
| App nativo antes da PWA | Dois fronts, zero tecido | PWA usada 4 semanas pela HQ |
| Substituição do CRM do cliente | PULSO é cérebro, não funil 2 | Cliente sem CRM nenhum (aí `nativo`) |
| Discador, caixa de e-mail completa | Inteligência comercial lê, não é Outlook | — |
| Desktop Electron/Tauri | PWA cobre | HQ provar que PWA falha no Windows |
| Conselho consultivo automatizado sem aprovação Nayara | Processo Land Grow | — |

---

## 7. Personas e jobs-to-be-done

### P1 — Fundador PME (direção)

ICP: R$ 300k–2M/mês, 10–30 pessoas, fundador acumula estratégico e operacional.  
**JTBD:** Quando a semana aperta, quero saber **onde o crescimento trava** em uma tela/conversa, para decidir as 3 coisas da semana sem abrir cinco sistemas.  
**Altitude padrão:** `direcao`. Drill operacional **não** é padrão (pergunta aberta Q3).

### P2 — Gestor comercial / CS (gestão)

**JTBD:** Ver vazamento de etapa e contas em silêncio com evidência, para coaching e prioridade — não para caçar vendedor.  
**Altitude:** `gestao`.

### P3 — Operação (vendedor, CS line, coordenação)

**JTBD:** Abrir o dia e ver **a minha fila** e a próxima ação do deal/card, sem o dossiê de conselho.  
**Altitude:** `operacional`.

### P4 — Nayara (HQ + drill)

**JTBD:** Cruzar carteira sem ser o ETL humano; aprovar o que vai ao cliente.  
Vê o cliente na altitude **contratada**, com `drill_ops` quando precisar. Não vê WhatsApp interno da operação do cliente (não está no PULSO).

### P5 — Consultor Land Grow

Capabilities atuais em Equipe (quase tudo no grupo `operacao`, **inclusive BIN**). Scale **não** mistura capability de tela com altitude de dado — são eixos diferentes (anexo 05).

### P6 — Integração (sistema do cliente)

Não é humano. Job: entregar evento idempotente e receber 202/200 previsível.

---

## 8. User stories

Prioridade: as que destroem o problema do §2 primeiro.

### US-01 — Chat com fonte cruzada (P0, onda 0)

Como **P1/P4**, quero perguntar “o que está travado nesta empresa?” e receber tese com **pelo menos duas fontes existentes**, para decidir sem abrir BIN e kanban na mão.

**Aceite:**

- Dado org com BIN preenchido e ≥ 1 card atrasado, quando pergunto isso no chat, então a resposta cita BIN (setor ou portão) **e** o card, com id resolvível.
- Dado fato ausente no índice, quando o modelo tenderia a inventar, então responde que não está no PULSO — não inventa causa, número, pessoa ou culpa.
- Dado `client_viewer`, quando pergunta, então só lê o que a RLS já permite; escrita de card não ocorre.

### US-02 — Direção não vê linha operacional (P0, onda 1)

Como **P1**, quero a síntese sem a lista de cards, para não virar operacional.

**Aceite:**

- Dado usuário só `direcao`, quando chama `GET /api/v1/orgs/{org}/entities?type=task`, então 403 ou lista vazia de projeção (sem título/responsável de card).
- Dado o mesmo usuário no chat, quando o retrieve monta o contexto, então não inclui payload de `Task` cru.
- Dado `drill_ops` concedido, quando ativa, então o acesso é auditado em `audit_log`.

### US-03 — Deal entra sem recadastro (P0, onda 2)

Como **P2**, quero que o Pipedrive (ou CRM da vez) atualize o PULSO sozinho, para não ter dois funis.

**Aceite:**

- Dado conexão HMAC válida, quando `POST` o mesmo `Idempotency-Key` duas vezes, então uma entidade `Deal`.
- Dado assinatura inválida, quando POST, então 401 e nada no índice.
- Dado módulo comercial em `espelho`, quando o usuário tenta criar deal nativo no PULSO, então a UI recusa e aponta o CRM.

### US-04 — Insight de conversão (P0, onda 3)

Como **P2**, quero ver onde a conversão quebra nesta semana, para agir no processo.

**Aceite:**

- Dado deals parados na etapa Proposta > N dias e e-mails sem resposta, quando o job de insight roda, então publica `Signal` com essas fontes.
- Dado ausência de evidência de pessoa, quando o job roda, então **não** afirma “o vendedor X é o problema”.
- Dado P1 (direção), quando abre comercial, então vê tese e taxa — não a grade de deals.

### US-05 — Risco de CS (P1, onda 3)

Como **P2**, quero contas em silêncio ou com tema de reclamação, para evitar churn surpresa.

**Aceite:**

- Silêncio > limiar configurável gera signal `cs.silence` com última atividade.
- Tema extraído de transcrição liga a trecho (offset), não a parafrase sem âncora.

### US-06 — Fila do dia no celular (P1, onda 4)

Como **P3**, quero instalar o PULSO e ver a fila + aviso de prazo, para não depender do Chrome desktop.

**Aceite:**

- PWA instalável (`display: standalone`) mostra fila da altitude operacional.
- Push de prazo usa o mesmo critério do digest atual (não inventa “hora do Scale”).
- BIN completo **não** é reimplementado no app.

### US-07 — Consultor sem vazar carteira (P0, contínuo)

Como **P5**, quero conversar com a Central IA só das orgs atribuídas.

**Aceite:** já parcialmente no `/api/chat` (surface admin + `authorizeOrg`). Scale: retrieve e API v1 herdam a mesma regra. Teste: org não atribuída → 403, zero chunk.

### US-08 — Documentos e reuniões no mesmo cérebro (P0, onda 0)

Como **P4**, quero que um PDF no Drive e a ata da reunião entrem no mesmo índice que o BIN.

**Aceite:** upload existente (`evidencias` / documentos) gera `intelligence_event`; pergunta cita o arquivo pelo nome + período.

### US-09 — Sala não vaza para o cliente (P0)

Como **P4**, quero a Sala como operação Land Grow.

**Aceite:** índice do portal **não** contém `staff_*`. Chat `surface=client` nunca recebe chunk `source=sala`.

### US-10 — Teto de custo por org (P0, onda 3)

Como **P4**, quero corte quando áudio/embedding estourar, para a conta não explodir.

**Aceite:** 80% do teto gera aviso HQ; 100% pausa ingestão de áudio (chat de texto continua).

### Edge cases (obrigatórios em teste)

- Org interna (`is_internal`) não entra em dossiê de cliente (já rejeitado hoje).
- Cliente encerrado: read-only; ingest webhook 409.
- Payload webhook > limite: 413, nada parcial.
- Embedding provider fora: evento fica `pending_index`, não some.
- Usuário `client_owner` sem módulo comercial ligado: nav sem Inteligência comercial.

---

## 9. Solution overview

Três eixos se cruzam em todo fato:

1. **Altitude** (`direcao` | `gestao` | `operacional`) — quem lê.
2. **Módulo** (estratégia, comercial, operação, financeiro, conhecimento, conversa, conselho, pessoas) — qual área; org liga; modo `nativo` ou `espelho`.
3. **Origem** (`pulso` | `webhook` | `sync` | `upload`).

Fato nasce em operação. Gestão e direção lêem **projeção**. Esconder o menu e deixar a query igual **não** resolve.

Toda escrita emite `intelligence_event` → chunk + embedding (pgvector) → retrieve híbrido filtrado por `org_id` + altitude + módulo → chat ou job de `Signal`. Citação obrigatória. Sala HQ fora do índice do cliente.

Playbook Land Grow Scale **ordena quais módulos ligar** (BIN → comercial → operação → governança). Não é outro produto nem relógio de 6 meses.

**Decisões (resumo; ADRs no anexo 04):**

| Decisão | Escolha | Recusado | Trade-off |
| --- | --- | --- | --- |
| Forma do sistema | Monólito modular Next + Supabase | Microserviços | Escala operacional do time, não “infinita” |
| Busca | pgvector + FTS no Postgres | Elasticsearch | Operação simples; revisar na onda 5 |
| Chat | Retrieve sob a pergunta | Dossiê 7k chars | Mais infra; menos invenção por omissão |
| Integração | Webhook genérico primeiro | Scraping / 15 conectores no dia 1 | Cliente precisa conseguir POST |
| Acesso | Projeção + RLS | Só CSS/menu | Mais SQL |
| Mobile | PWA → Expo leitura | App completo no dia 1 | BIN/kanban pesado fica web |
| Comercial | Espelho do CRM | CRM 2 | Quem não tem CRM usa nativo |

---

## 10. Estado atual vs alvo (gap)

Detalhe no [anexo 01](anexos/01-estado-atual.md).

| Área | Hoje | Alvo Scale |
| --- | --- | --- |
| Auth | HQ `platform_admin`/`consultant` + capabilities; cliente owner/member/viewer | + `membership_scopes` (altitude + módulos) |
| Nav HQ | Mesa, Trabalho, Carteira, Sistema (`destinations.ts`) | Nav por módulo ligado + altitude |
| Nav cliente | Painel, Atividades, Objetivos, Reuniões, Calendário, Projeto, BIN, MIN, Métricas, Documentos, Central IA, Ajustes. **Sem Financeiro** | + Inteligência comercial se módulo on; sem Financeiro até GO |
| Chat | Pack clipado BIN/reuniões/tarefas/objetivos | Retrieve + citações + corte altitude |
| Integração | E-mail, Drive, Google login, WhatsApp (número), Agenda (conector), Notion, **webhook de saída** | + inbox HMAC, OpenAPI v1, mapa de campos |
| BIN | Instrumento + leitura; scores ao vivo rejeitados | Continua instrumento; vira `Diagnosis` no índice |
| MIN | Blocos | `Diagnosis` / evidência para reconciliação |
| Boards / CRM | Kanban nativo (org interna para CRM HQ) | Canônico `Task`/`Deal`; espelho se CRM externo |
| Sala | HQ Slack-like, unread, fluxos, notas | Fora do índice cliente; HQ pode cruzar |
| Financeiro | HQ Omie-like | Fora do portal; opcional `LedgerLine` se Nayara ligar |
| Docs | Drive / evidências | Chunks no índice |
| App | Site | PWA depois Expo |

---

## 11. Information architecture (alvo)

```
PULSO
├── Shell (seletor de org, altitude visível, busca)
├── Mesa          → síntese da altitude do usuário
├── Trabalho      → fila (ops) / rituais (gestão)
├── Carteira      → orgs (HQ)
├── Módulos ligados
│   ├── estrategia     BIN / MIN / Compass (quando existir)
│   ├── comercial      funil nativo OU espelho + inteligência
│   ├── operacao       boards, objetivos, reuniões
│   ├── financeiro     só HQ / só se módulo on
│   ├── conhecimento   documentos, evidências
│   ├── conversa       Sala (HQ only)
│   └── conselho       depois
├── Central IA    chat com citações + seletor de org (HQ)
├── Integrações   conexões, últimos eventos, reprocessar, chaves
└── Ajustes       pessoas, módulos, tetos, LGPD
```

Deep links estáveis: `/clientes/[slug]/…` e `/admin/…` permanecem. Módulos novos **não** quebram URL antiga.

---

## 12. Requisitos funcionais

Cada item: comportamento + aceite. P0 = a onda correspondente não embarca sem isso.

### 12.1 Tecido de inteligência (onda 0) — Must

**REQ-INTEL-01** Indexar escritas nativas  
BIN (respostas + portões + flags, não score inventado), cards de board, objetivos, reuniões (título/resumo/tópicos), evidências/documentos com texto extraível.  
*Aceite:* insert/update gera `intelligence_event` em < 30 s (ou `pending` visível). Soft-delete remove ou marca chunk `tombstone`.

**REQ-INTEL-02** Retrieve no chat  
Substituir `renderOrgContext` clipado como **única** fonte. System prompt continua separado do dossiê (`pulsoChatSystem` / `pulsoChatDossier`).  
*Aceite:* pergunta dispara busca híbrida; contexto injetado é lista de trechos com `source_type`, `source_id`; teto de tokens configurável; US-01 passa.

**REQ-INTEL-03** Citações resolvíveis  
UI mostra fonte clicável (setor BIN, card, reunião, arquivo).  
*Aceite:* clique abre a origem; id inválido não renderiza como fato.

**REQ-INTEL-04** Isolamento  
Retrieve aplica `can_access_org` + capabilities HQ.  
*Aceite:* US-07; teste automatizado de duas orgs.

**REQ-INTEL-05** Sala fora do portal  
*Aceite:* US-09.

**REQ-INTEL-06** Instrumentação  
Eventos §25.  
*Aceite:* um turno de chat grava `intel.chat_turn` + N `intel.citation` ou `intel.citation_none`.

### 12.2 Altitude (onda 1) — Must

**REQ-ALT-01** `membership_scopes`  
Uma pessoa, numa org, tem altitude + lista de módulos. HQ usa o mesmo conceito sobre a org cliente (contratada).  
*Aceite:* sem scope, fallback: cliente `owner` → `gestao` temporário até Nayara decidir default; `member` → `operacional`; `viewer` → `operacional` read-only. **Default de direção não é implícito.**

**REQ-ALT-02** Projeções  
Views/SQL: `v_ops_tasks`, `v_mgmt_task_stats`, `v_dir_health`.  
*Aceite:* US-02.

**REQ-ALT-03** Menu e API cortam igual  
*Aceite:* mesmo 403 na API e ausência no nav.

**REQ-ALT-04** Drill auditado  
*Aceite:* US-02 bullet 3.

### 12.3 Inbox de integração (onda 2) — Must

**REQ-INT-01** OpenAPI `/api/v1`  
Auth: chave de conexão (hash no banco, valor só na criação) + HMAC do body.  
*Aceite:* spec publicada no anexo 03; breaking change só em `/v2`.

**REQ-INT-02** Inbox genérico  
`POST /api/v1/webhooks/{connectionId}/ingest` + `POST /api/v1/orgs/{orgId}/events`.  
*Aceite:* US-03; 401/409/413/429 documentados.

**REQ-INT-03** Idempotência  
Unique `(connection_id, provider_event_id)` e header `Idempotency-Key`.  
*Aceite:* replay 24h devolve o mesmo recurso.

**REQ-INT-04** Mapper  
JSON do cliente → objeto canônico; campos desconhecidos em `raw` (não indexados para o chat até mapeados).  
*Aceite:* campo não mapeado não aparece como fato no chat.

**REQ-INT-05** Hub UI  
Últimos eventos, status, reprocessar, rotacionar chave.  
*Aceite:* evento `failed` mostra motivo; reprocessar não duplica.

**REQ-INT-06** Modo espelho  
Um pipeline por org.  
*Aceite:* US-03 bullet 3.

**REQ-INT-07** Webhook de saída permanece  
Catálogo atual (`kind: webhook`) não quebra.  
*Aceite:* regressão de automação de prazo.

### 12.4 Inteligência comercial (onda 3) — Must / Should

**REQ-COM-01** Entidade `Deal` + timeline (card + e-mail + reunião) — P0  
**REQ-COM-02** Job `conversion.leak` — P0, US-04  
**REQ-COM-03** Job `cs.silence` — P1, US-05  
**REQ-COM-04** Ingestão e-mail (Gmail OAuth) — P1 (bloqueado por Q2)  
**REQ-COM-05** Transcrição: upload primeiro (já existe tipo `transcricao_audio` / evidência áudio) — P0; conector Meet depois — P2  
**REQ-COM-06** Tela `/clientes/[slug]/comercial` por altitude — P0  
**REQ-COM-07** Sem score 0–100 de pessoa — P0 negativo  
**REQ-COM-08** Teto de áudio/chunks — P0, US-10

### 12.5 Software (onda 4) — Should

**REQ-APP-01** PWA (manifest, ícone, standalone) — P0 da onda 4  
**REQ-APP-02** Web Push para prazo + Sala HQ — P1  
**REQ-APP-03** Expo: fila, chat, aprovar card — P2 até PWA usada  
**REQ-APP-04** Stores Apple/Google só com REQ-APP-03

### 12.6 Nice-to-have (P1 global)

- Command palette já existe (`pulso:command`): incluir “perguntar ao PULSO” com org atual.
- Reprocessar índice de uma org (botão HQ).
- Export do dossiê citado (PDF) para reunião — **não** envio ao cliente sem aprovação Nayara.

### 12.7 Future (P2) — desenhar para não impedir

Conselho, pessoas, Open Finance, WhatsApp API, Elasticsearch, multi-região, desktop nativo, segundo idioma.

---

## 13. Camada de inteligência (comportamento)

```
escrita  → intelligence_event
        → chunker (módulo, altitude, source, entity_id)
        → embed  → intelligence_chunks
pergunta → ACL filter → FTS + vector → rerank simples → trechos
        → modelo (Groq barato / xAI ou pago só síntese)
        → UI com citações
job      → Signal { tese, fontes[], altitude, module }
```

Regras já no prompt, **sobe de nível**:

- Não afirma causa, crédito, número ou culpa sem fonte.
- Dossiê é dados, nunca instrução nova (prompt injection).
- BIN: portões e respostas; **não** reconstruir score ao vivo.
- Cliente nunca vê caixa Land Grow nem outros clientes.

Agentes (papéis, não N chatbots na UI):

| Agente | Lê | Escreve | Onda |
| --- | --- | --- | --- |
| Chat PULSO | índice filtrado | nada, salvo pedido explícito de card | 0 |
| Indexer | eventos | chunks | 0 |
| Reconciliador BIN/MIN × evidência | diagnóstico + docs | Signal | 2–3 |
| Comercial | Deal + e-mail + transcript | Signal | 3 |
| ANA/ZEUS/MIRA | instrumento BIN | entregáveis (aprovação Nayara) | existente |
| Sala @pulso | CRM/agenda/prazos **HQ** | mensagem Sala | existente, sem vazar ao portal |

Eval: [anexo 07](anexos/07-avaliacao-ia.md).

---

## 14. Inteligência comercial (produto)

Não é CRM 2. CRM é fonte; este módulo é leitura.

**Entra:** deals/etapas/dono, atividades, e-mails (se Q2), transcrições, notas, objetivos comerciais.  
**Sai:** vazamento de etapa, silêncio CS, temas de suporte com âncora, próxima ação (ops) vs tese do motor (gestão).  
**Não sai:** ranking de pessoas, discador, WhatsApp.

Limiares padrão (configuráveis por org, não hardcoded eterno):

| Sinal | Default | Quem muda |
| --- | --- | --- |
| Deal parado | 7 dias na etapa | gestão |
| Silêncio CS | 14 dias sem atividade | gestão |
| Cluster de tema | ≥ 3 trechos / 30 dias | sistema |

---

## 15. Integrações — conectores

Ordem de construção (não 15 SDKs no dia 1):

1. Webhook genérico (qualquer ERP/CRM com POST)
2. Um CRM da carteira (Q1: Pipedrive / RD / HubSpot — decidir)
3. Google Drive (já) + Gmail ingest (Q2)
4. Calendar (conector já; sync ainda “depois” no catálogo — promover)
5. CSV/upload financeiro (cliente só com GO de módulo)

Cada `integration_connections`: org, kind, secret hash, status, `last_event_at`, mapper version. Segredo **nunca** no JS do cliente.

---

## 16. Acesso

Matriz completa: [anexo 05](anexos/05-matriz-permissoes.md).

Princípio: **a query é a política.** Menu é reflexo.

Papéis atuais permanecem. Altitude é **outro eixo**.

| Papel hoje | Scope Scale default (provisório até Q3) |
| --- | --- |
| `client_owner` | `gestao` + módulos ligados |
| `client_member` | `operacional` |
| `client_viewer` | `operacional` read |
| `consultant` | capabilities de tela ∩ orgs atribuídas ∩ altitude contratada |
| `platform_admin` | tudo + drill auditado |

---

## 17. UX

Fluxos: [anexo 06](anexos/06-ux-fluxos.md).

Regras:

- Chat: respostas com bloco de fontes; vazio = “não está no PULSO”, nunca parágrafo genérico de consultoria.
- Hub de eventos: falha visível (não toast único).
- Comercial direção ≠ comercial gestão ≠ fila ops.
- Sem jargão interno (RADAR, handoff, “onda”) no portal do cliente.
- Acessibilidade: teclado no hub e no chat; contraste tokens atuais; não depender só de cor no status do evento.
- Performance percebida: primeiro token do chat < 3 s p95 com retrieve; se retrieve > 2 s, mostrar “buscando nas fontes”.

Estados obrigatórios: loading, vazio (sem módulo / sem evento / sem citação), erro (401 HMAC, 429, teto de custo), encerrado, pending_index.

---

## 18. De site para software

1. PWA no mesmo Next.js  
2. Web Push (e-mail já existe; badge Sala é ensaio)  
3. Expo compartilhando API v1 (fila, chat, aprovar)  
4. Desktop nativo só se PWA falhar  

Apple ~US$ 99/ano, Play ~US$ 25 uma vez — só na onda 4 com app.

---

## 19. Arquitetura técnica

Manter: App Router, server actions, `authorizeOrg`, RLS default-deny, `createAdminClient` só no servidor, Zod nas APIs.

Acrescentar (por onda): `src/app/api/v1/`, `src/lib/intel/{canonical,index,retrieve}.ts`, `src/lib/integrations/inbound.ts`, `src/lib/comercial/insights.ts`, migrations `membership_scopes` + intel + integrations inbound.

Jobs: cron Vercel (já `0 11 * * *` UTC = 8h BRT) no começo; Inngest/Trigger.dev se a fila de embed/áudio estourar. Sem Python paralelo “porque IA”.

Graphify: ferramenta de engenharia **fora** do produto; `graphify update .` após código, não clonar para o repo.

---

## 20. Dados

Schema alvo: [anexo 02](anexos/02-modelo-de-dados.md).

Novas tabelas (nomes de trabalho): `org_modules`, `membership_scopes`, `canonical_entities`, `integration_connections` (estender a de 0030 se já cobrir), `integration_events`, `intelligence_events`, `intelligence_chunks`, `intelligence_runs`, `signals`, `conversation_records`, `transcripts`.

`org_id` UUID em FK, nunca slug. Extensão `pgvector`. PII de e-mail/transcrição minimizada, retenção no anexo 08.

---

## 21. API

Contrato: [anexo 03](anexos/03-api-e-webhooks.md).

Mínimo: health, ingest, events, entities (projeção), signals read. Erros com código estável, **não** `200 { error }`. Rate limit por conexão. Versionamento `/v1`.

---

## 22. IA e qualidade

Provedor geração: Groq (barato) padrão; xAI se `XAI_API_KEY`; sem OpenRouter free. Embedding: um fornecedor, um modelo, versão gravada no chunk.

Eval obrigatória antes de chamar “onda 0 pronta”: conjunto âncora no anexo 07. Falha de eval = a onda não fecha, mesmo com a tela bonita.

---

## 23. Requisitos não funcionais

| Tema | Alvo |
| --- | --- |
| Latência retrieve | p95 < 1,5 s em 10 orgs / índice < 100k chunks |
| Ingest webhook | ack < 500 ms; processamento async |
| Chat primeiro token | p95 < 3 s |
| Disponibilidade | igual Vercel/Supabase atuais; sem SLO novo até onda 5 |
| Idempotência | replay 24 h |
| Tamanho evento | teto 256 KB JSON |
| Arquivo | limite atual evidências; áudio no teto de minutos/org |
| Observabilidade | logs Vercel + tabela `intelligence_runs`; Sentry na onda 5 |
| i18n | pt-BR apenas |
| Browser | os que o PULSO já suporta; PWA Chrome/Edge/Safari iOS |

---

## 24. Segurança e LGPD

[anexo 08](anexos/08-lgpd-seguranca.md).

Ameaças P0: IDOR entre orgs, prompt injection via dossiê (já mitigado em parte), vazamento Sala→cliente, chave de webhook no front, HMAC fraco, PII de e-mail no prompt demais.

LGPD: base legal por conector; operador vs controlador; DSAR export/delete inclui chunks e events; retenção de transcrição definida (proposta 180 dias, Q a confirmar).

---

## 25. Instrumentação

| Evento | Quando | Props |
| --- | --- | --- |
| `intel.chat_turn` | fim do turno | org, surface, altitude, n_chunks, latency_ms, provider |
| `intel.citation` | cada fonte renderizada | source_type, source_id, resolved bool |
| `intel.citation_none` | afirmação sem fonte (não deveria) | — |
| `intel.ingest_acked` | webhook aceito | connection, type |
| `intel.ingest_failed` | 4xx/5xx | code |
| `intel.index_done` | chunk gravado | entity_type |
| `intel.signal_published` | job | kind, n_sources |
| `intel.teto_hit` | 80/100% | kind audio/embed |
| `intel.idor_denied` | 403 altitude/org | — |

Sem analytics de produto hoje: **onda 0 inclui gravar isso** (tabela `product_events` ou log estruturado). Não inventar dashboard de vaidade.

---

## 26. Custos

Ordem de grandeza, câmbio ~R$ 5,50 (alinhado a `docs/lancamento/CUSTOS.md`, out/2026). Conferir na contratação.

| Faixa | Ligado | USD/mês | ~BRL |
| --- | --- | --- | --- |
| Hoje | Vercel Pro + Supabase Pro + Groq | 50–65 | 275–360 |
| Ondas 0–2 · ~10 orgs | + vector + embedding + webhook | 65–190 | 360–1.050 |
| Ondas 3–4 · 30–50 orgs | + transcrição + PWA/loja | 150–500 | 825–2.750 |

BIN pago ~US$ 0,80–1,80/rodada **não** estoura. Áudio + embedding de e-mail estoura. **Teto por org obrigatório** (REQ-COM-08).

Não contratar cedo: Elasticsearch, Kafka, segundo banco, Electron, cientista de dados só para este desenho.

Unit economics piloto: teto sugerido US$ 15/org/mês variável (embed+chat+áudio) até haver dado real.

---

## 27. Launch, flags, rollback

Não há data de mercado. Lançamento = **ligar a onda numa org piloto**.

| Fase | Audiência | Gate |
| --- | --- | --- |
| Flag off | engenharia | testes + eval anexo 07 |
| Internal | org Land Grow | US-01 e US-09 em uso real 1 semana |
| Piloto | 1 cliente (Nayara escolhe) | zero invenção grave; HMAC estável |
| Carteira | demais com GO | teto de custo no verde |

**Flags (nomes de trabalho):** `intel_retrieve`, `intel_altitude`, `intel_inbound_v1`, `intel_comercial`, `intel_pwa`. Default off. Rollback = flag off; índice pode ficar, chat volta ao pack clipado.

**Rollback imediato se:** citação inventada reproduzível, vazamento cross-org, custo variável > 3× teto sem aviso.

Não há GTM público, três planos, nem e-mail de “lançamos o Scale”. Comunicação: Nayara para o piloto, linguagem do gestor, sem jargão.

---

## 28. Ondas (timeline)

Sem datas-calendário. Ordem obrigatória: **0 → 1** antes de vender altitude; **2** pode em paralelo a 1 depois do tecido; **3** depende de 0+2; **4** depois de 0 útil no desktop; **5** com volume.

| Onda | Objetivo | P0 que fecha | Não faz |
| --- | --- | --- | --- |
| 0 Tecido | Tudo nativo conversa | REQ-INTEL-01..06, US-01, US-08 | conector, app |
| 1 Altitude | Direção ≠ ops | REQ-ALT-01..04, US-02 | tela nova de módulo |
| 2 Inbox | Sem recadastro | REQ-INT-01..07, US-03 | WhatsApp API, Open Finance |
| 3 Comercial | Conversão/CS com fonte | REQ-COM-01,02,06,07,08, US-04 | discador, score pessoa |
| 4 Software | Fora do Chrome | REQ-APP-01, US-06 | BIN nativo |
| 5 Endurecer | 50+ orgs | NFR retrieve, DLQ, PITR opcional | microserviços |

Estimativa de esforço (t-shirt, 1 dev + Nayara revisão): 0 = L, 1 = M, 2 = L, 3 = L, 4 = M, 5 = M. **Não é compromisso de sprint.**

RICE (indicativo, Reach = orgs piloto ~3, Impact 3, Confidence 50% até piloto, Effort person-months):

| Onda | E | RICE ~ | Nota |
| --- | --- | --- | --- |
| 0 | 1.5 | alto | destrava o resto |
| 1 | 0.8 | alto | segurança de dado |
| 2 | 1.5 | alto | adoção |
| 3 | 2.0 | médio | depende Q1/Q2 |
| 4 | 1.0 | baixo agora | depois do tecido |

---

## 29. Riscos

| Risco | Prob. | Impacto | Mitigação |
| --- | --- | --- | --- |
| Chat inventa causa | Alta | Crítico (confiança) | retrieve + citação + eval; autocheck |
| Webhook lixeira | Média | Alto | mapper estrito, `raw` fora do chat, DLQ |
| Altitude só no front | Média | Crítico | RLS + teste IDOR |
| Dois CRMs | Média | Alto | um modo por módulo |
| Custo de áudio | Alta se sem teto | Alto | REQ-COM-08 |
| App cedo | Média | Alto (foco) | PWA primeiro |
| Escopo “plataforma completa” | Alta | Crítico | este PRD é fundo; onda com GO |
| Gmail/OAuth do cliente | Média | Médio (legal) | Q2; DPA antes |

---

## 30. Open questions

**Bloqueantes antes da onda indicada**

| ID | Pergunta | Dono | Antes da |
| --- | --- | --- | --- |
| Q1 | Primeiro conector nomeado ou só webhook genérico? | Nayara | onda 2 |
| Q2 | E-mail do cliente na onda 3 ou só transcrição? | Nayara + legal | onda 3 |
| Q3 | Direção com `drill_ops` por padrão? | Nayara | onda 1 |
| Q4 | Default de `client_owner`: direção ou gestão? | Nayara | onda 1 |
| Q5 | Teto de minutos de áudio e chunks/org? | Nayara | onda 3 |
| Q6 | Retenção de transcrição (proposta 180 dias)? | Nayara | onda 3 |
| Q7 | Qual cliente é piloto da onda 2? | Nayara | onda 2 |

**Não bloqueantes**

| ID | Pergunta | Dono |
| --- | --- | --- |
| Q8 | Sala 100% HQ para sempre? | Nayara |
| Q9 | Inngest vs só cron — decidir quando a fila do embed passar de 5 min | engenharia |
| Q10 | Fornecedor de embedding (um) | engenharia, com teto de custo |

---

## 31. Parking lot (boas ideias, fora)

- WhatsApp Business API como fonte
- Open Finance
- Conselho automático no portal
- Relógio / fases do programa Scale como produto separado
- Recursos / Grafo no menu (já recusado)
- Métricas fake / gauges de vaidade
- Autonomia de “travar Scale por card aberto” (prompt já proíbe sugerir)

---

## 32. Glossário

| Termo | Significado neste PRD |
| --- | --- |
| Altitude | Camada de leitura: direção, gestão, operacional |
| Canônico | Objeto interno (`Deal`, `Task`…) depois do mapper |
| Chunk | Pedaço indexado com embedding e ponteiro à origem |
| Espelho | Módulo cuja fonte da verdade é sistema externo |
| Nativo | Módulo cuja fonte da verdade é o PULSO |
| Signal | Insight publicado com tese + fontes + altitude |
| Tecido | Eventos + índice + retrieve que fazem os módulos conversarem |
| Onda | Fatia entregável; não é sprint até virar epic |
| HQ | Superfície Land Grow (`/admin`, Sala) |
| Portal | Superfície do cliente (`/clientes/[slug]`) |
| BIN | Diagnóstico dos setores (não “BIM”) |
| MIN | Módulo de indicadores / blocos já no produto |

---

## 33. Como este PRD vira trabalho

1. Nayara responde Q1–Q7 no momento da onda (não precisa agora).  
2. Aprova a **onda**, não o pacote inteiro.  
3. Epic em `docs/stories/epics/` com IDs `REQ-*` / `US-*` copiados.  
4. Story GO/NO-GO.  
5. Flag off → internal → piloto.  
6. Eval do anexo 07 no gate.

Até lá, o PULSO continua o sistema web atual. Este arquivo é o contrato do software de inteligência que ele vira.
