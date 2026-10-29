# Anexo 04 — Architecture Decision Records

Status: Proposed até a onda correspondente ter GO. Não são tickets.

---

## ADR-001 — Monólito modular Next.js + Supabase

**Contexto:** tentação de “serviço de IA” Python, fila Kafka, segundo banco.  
**Decisão:** permanecer no App Router + Postgres. Intel, inbound e jobs são pastas `src/lib/*`, não repos.  
**Consequência:** um deploy Vercel; limites de timeout (já 60s no chat). Se job passar disso, extrair **só o worker** (Inngest), não a API.  
**Recusado:** microserviços no time atual.

## ADR-002 — pgvector + FTS em vez de Elasticsearch

**Contexto:** retrieve híbrido.  
**Decisão:** `vector` + `tsvector` no Supabase.  
**Consequência:** operação barata; onda 5 revisa se p95 > 1,5 s em 50 orgs.  
**Recusado:** ES/OpenSearch cedo.

## ADR-003 — Projeção + RLS, não esconder menu

**Contexto:** direção não pode ver card cru.  
**Decisão:** views/funções SQL `can_read_altitude` + retrieve cortando `altitude_min`. Menu reflete a mesma política.  
**Consequência:** mais SQL e testes IDOR; único jeito de não vazar no `/api/v1` e no chat.  
**Recusado:** `if (role) hideSidebar`.

## ADR-004 — Webhook genérico antes de conectores oficiais

**Contexto:** cada CRM é um SDK.  
**Decisão:** inbox HMAC + mapper JSON primeiro; um conector nomeado só com Q1.  
**Consequência:** o cliente (ou a Land Grow) precisa POST. Sem scraping.  
**Recusado:** 15 plugins no dia 1; Apify como caminho principal.

## ADR-005 — Retrieve no lugar do dossiê único

**Contexto:** `renderOrgContext` 7k chars.  
**Decisão:** busca sob a pergunta; system prompt separado (`pulsoChatDossier`).  
**Consequência:** depende do índice estar fresco; fallback: se retrieve falhar, responder “índice indisponível”, **não** colar um pack velho silencioso.  
**Recusado:** só aumentar o clip para 50k.

## ADR-006 — PWA antes de app nativo

**Contexto:** “virar software e aplicativo”.  
**Decisão:** manifest + standalone + push; Expo só leitura/aprovação depois de uso real da PWA.  
**Recusado:** reescrever BIN/kanban em React Native.

## ADR-007 — Um funil por org

**Contexto:** CRM nativo + Pipedrive.  
**Decisão:** `org_modules.mode` `nativo` | `espelho`. Espelho desliga criação nativa de Deal.  
**Consequência:** quem não tem CRM usa nativo.  
**Recusado:** sync bidirecional perfeito no v1 (espelho é inbound-first; write-back é P2).

## ADR-008 — Sala é HQ

**Contexto:** tudo deve conversar.  
**Decisão:** conversar ≠ o cliente ler `#operação`. Chunks `source=sala` só no retrieve `surface=admin`.  
**Consequência:** cruzamento Land Grow sim; portal não.  
**Recusado:** Sala no índice do cliente.

## ADR-009 — Sem três planos; sem Financeiro no portal; sem score BIN ao vivo

**Contexto:** colunas e telas já existem ou existiram.  
**Decisão:** constraints de produto vigentes entram como testes negativos.  
**Recusado:** usar `organizations.plan` como comercial; aplicar 0031 no cliente; gauges 0–100 em reunião.

## ADR-010 — Sem Graphify no produto

**Contexto:** grafo interno de engenharia.  
**Decisão:** Graphify fica fora do repo de produto como feature. `graphify update .` após código.  
**Recusado:** menu Recursos/Grafo (já tirado).

## ADR-011 — Segredo de integração só hashed

**Contexto:** webhooks.  
**Decisão:** valor da chave uma vez; HMAC secret no vault/tabela hash; rotation no hub.  
**Recusado:** env var global única para todos os clientes.

## ADR-012 — Modelo barato no chat, pago na síntese

**Contexto:** Groq vs xAI vs Claude.  
**Decisão:** chat cotidiano Groq; BIN/conselho/jobs de tese comercial podem modelo pago. Embedding = um fornecedor. Sem OpenRouter free.  
**Consequência:** qualidade desigual; eval pega regressão.
