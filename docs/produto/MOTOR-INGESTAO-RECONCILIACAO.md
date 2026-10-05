# Motor de Ingestão Multi-Fonte e Reconciliação — PULSO

**Adendo ao PRD v1.0 · Camadas 1-3 · Land Grow · 11/07/2026**

> Este documento registra a revisão de escopo decidida em 11/07/2026 e desenha as três primeiras camadas do PULSO: ingestão de dados (arquivos + conexões diretas), diagnóstico declarado (BIN) e o motor de reconciliação que cruza os dois.

---

## 0. Decisão registrada

O PRD v1.0 (seção 6) adiava CRM, Open Finance e Instagram para a Fase 3, para não travar o lançamento com integrações técnicas. **Essa decisão foi revisada em 11/07/2026**: essas conexões entram já na ingestão inicial do produto, porque a reconciliação entre "o que o cliente diz" e "o que os dados reais mostram" é o diferencial central do PULSO frente a qualquer ferramenta de BI genérica — e sem dado real conectado, a reconciliação não existe.

**Consequência técnica direta:** o PULSO deixa de ser uma SPA estática sem backend (premissa original do ARQUITETURA-SISTEMA.md, seção 3.5) e passa a rodar sobre **Vercel (funções serverless) + Supabase (Postgres, Auth, Storage)**. Ver seção 6.

---

## 1. Visão geral do fluxo

```
CAMADA 1 — INGESTÃO
├── Conexão direta (API): CRM · Financeiro (Open Finance) · Instagram/Meta
└── Upload: PDF · Excel/CSV · texto livre · áudio transcrito
                    │
                    ▼
            NORMALIZAÇÃO
   (cada fonte tem parser próprio → mapeia para os blocos
    de área: financeiro, operacional, comercial, pessoas,
    estratégico, marketing)
                    │
                    ▼
CAMADA 2 — DIAGNÓSTICO DECLARADO (BIN)
   Formulário respondido pelo cliente/gestor
   (o que ELE ACHA que está acontecendo)
                    │
                    ▼
CAMADA 3 — MOTOR DE RECONCILIAÇÃO
   Cruza declarado × evidência real
   → lista de inconsistências, rankeada por severidade
                    │
                    ▼
   Alimenta ANA (RADAR) com sinal evidence-based,
   não só autoavaliação → COMPASS → HORIZON → ROUTE PLANNER
```

---

## 2. Camada 1 — Ingestão

### 2.1 Conexão direta (API)

| Fonte                         | Como                                                                          | Realidade técnica                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Instagram/Meta Business**   | Graph API, token de longa duração via conta Business                          | Exige App Review da Meta para permissões de insights de audiência — **prazo real 2-4 semanas**, não é imediato. Sem isso, só dá pra ler métricas básicas.                                                                                                                                                |
| **Financeiro (Open Finance)** | Pluggy ou Belvo (agregadores certificados no Brasil, falam com Banco Central) | Cliente autoriza consentimento formal (LGPD + Open Finance). **Custo por CPF/CNPJ consultado** — precisa entrar na precificação do produto, não é custo zero.                                                                                                                                            |
| **CRM**                       | Integração nativa via API do provedor                                         | **Não existe CRM único de mercado.** Cobrir todos de uma vez não é realista. Começar com os 2 mais usados na base atual/ICP (candidatos: Pipedrive, RD Station CRM, HubSpot, Ploomes) + fallback universal via **export CSV** para os demais, em vez de tentar construir N integrações nativas de saída. |

### 2.2 Upload (já existe no MVP, sem mudança)

PDF (DRE, balancete, extrato), Excel/CSV, texto livre, áudio transcrito via Claude API.

### 2.3 Normalização

Parser por tipo de fonte converte o dado bruto nos blocos já existentes no schema (`kpis`, `maturidade_por_area`, `analise_por_area`). Ex.: Instagram Insights → métricas de marketing; extrato/DRE → `kpis.faturamento`, `kpis.margem`, `kpis.inadimplencia`; CRM → `kpis.clientes_ativos`, `perfil.carteira`.

---

## 3. Camada 2 — Diagnóstico declarado (BIN)

Reaproveita o formulário já existente no MVP (12 perguntas), **não** o questionário BIN completo de 63 perguntas — para não pesar o onboarding do produto recorrente (Inteligência Mensal). O BIN completo continua exclusivo do produto "Diagnóstico Estratégico 360°" (R$4.500, vendido à parte).

**Decisão em aberto:** confirmar com Nayara se as 12 perguntas do MVP têm granularidade suficiente para gerar pares de correspondência úteis na Camada 3, ou se algumas precisam ser reescritas para ficarem verificáveis contra dado real (ex: trocar "como você avalia sua margem?" por "qual sua margem líquida em %?", que é diretamente comparável ao DRE).

---

## 4. Camada 3 — Motor de Reconciliação (o núcleo novo)

### 4.1 Mapa de correspondência (exemplos)

| Pergunta declarada                        | Métrica esperada                                | Fonte de evidência                        |
| ----------------------------------------- | ----------------------------------------------- | ----------------------------------------- |
| "Qual sua margem líquida?"                | `kpis.margem`                                   | DRE (upload) ou financeiro (Open Finance) |
| "Você tem inadimplência relevante?"       | `kpis.inadimplencia`                            | Extrato/Open Finance                      |
| "Quantos clientes ativos você tem?"       | `kpis.clientes_ativos`                          | CRM                                       |
| "Como está seu engajamento no Instagram?" | crescimento de seguidores / taxa de engajamento | Instagram Insights                        |

### 4.2 Regras de match

- **Numérica** — desvio tolerável antes de virar alerta (ex.: ±10%). Declarou margem de 30%, dado real mostra 28% → dentro da tolerância, não gera inconsistência. Declarou 30%, real é 12% → inconsistência.
- **Categórica** — resposta sim/não vs. presença/ausência de evidência (ex.: "não tenho inadimplência" vs. títulos vencidos no extrato).
- **Semântica** — texto livre comparado via Claude contra o conteúdo do documento (ex.: descrição do problema no formulário vs. o que aparece no CRM/financeiro).

### 4.3 Severidade

- **Crítica** — declaração contradiz o dado com impacto financeiro ou de risco direto (ex.: inadimplência negada, mas presente e alta).
- **Moderada** — desvio relevante mas sem risco imediato.
- **Leve** — ausência de dado para verificar (não é contradição, é lacuna).

### 4.4 Output — extensão do schema

Novo campo em `client-data-schema.json`:

```json
"inconsistencias": {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "area": { "type": "string" },
      "pergunta_origem": { "type": "string" },
      "declarado": { "type": "string" },
      "evidencia_real": { "type": "string" },
      "fonte_evidencia": { "type": "string" },
      "severidade": { "type": "string", "enum": ["critica", "moderada", "leve"] },
      "impacto": { "type": "string" }
    }
  }
},
"fontes_conectadas": {
  "type": "object",
  "properties": {
    "crm": { "type": "object", "properties": { "provedor": {"type": "string"}, "ultima_sincronizacao": {"type": "string", "format": "date-time"} } },
    "financeiro": { "type": "object", "properties": { "provedor": {"type": "string"}, "ultima_sincronizacao": {"type": "string", "format": "date-time"} } },
    "instagram": { "type": "object", "properties": { "conta": {"type": "string"}, "ultima_sincronizacao": {"type": "string", "format": "date-time"} } }
  }
}
```

Inconsistências críticas alimentam automaticamente `alertas` (campo já existente no schema).

---

## 5. Como isso muda o pipeline de agentes

- **ANA (RADAR)** passa a receber, além das respostas do formulário, a lista de `inconsistencias` — o diagnóstico deixa de ser só autoavaliação e passa a ser confrontado com evidência real antes de gerar o score de maturidade.
- **ZEUS (COMPASS/HORIZON)** usa as inconsistências críticas como insumo direto para a síntese estratégica — uma contradição declarado × real é, por definição, um ponto cego do gestor, que é exatamente o tipo de achado que o COMPASS deve nomear.

---

## 6. Impacto na arquitetura técnica (mudança de fundação)

O ARQUITETURA-SISTEMA.md (seção 3.5) definia PULSO como SPA estática sem backend, com `client-data.json` em `localStorage`. Isso **deixa de ser suficiente** com conexões diretas: OAuth, chamadas a Pluggy/Belvo/Meta Graph API e guarda de token exigem servidor — não podem rodar no navegador do cliente por motivo de segurança.

**Stack revisado:**

| Camada               | Tecnologia                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend (shell SPA) | Mantém o que já existe: `index.html` + `app.js` + `views/`                                                                                                                            |
| Backend              | **Vercel Functions** (serverless) — endpoints de OAuth callback, sync de fontes, reconciliação                                                                                        |
| Persistência         | **Supabase Postgres** — tabela `clientes`, tabela `periodos_dados` (coluna `jsonb` compatível com o schema atual), tabela `conexoes` (tokens **criptografados**, nunca em texto puro) |
| Arquivos (uploads)   | **Supabase Storage** — PDF/Excel/áudio por cliente                                                                                                                                    |
| Auth                 | **Supabase Auth** — antecipa o "Portal do cliente" que estava previsto só na Fase 4 do PRD                                                                                            |

**Endpoints previstos (Vercel Functions):**

- `/api/oauth/[provider]/callback` — troca code por token, grava criptografado no Supabase
- `/api/ingest/[provider]/sync` — puxa dado da fonte, normaliza, grava em `periodos_dados`
- `/api/reconcile` — roda o motor de reconciliação (chama Claude API), grava `inconsistencias`
- `/api/upload` — recebe arquivo, salva no Storage, dispara extração (Claude para PDF/Excel)

**O que isso muda no custo operacional do PRD (seção 7):** deixa de ser ~R$0/cliente/mês. Precisa orçar: Supabase (plano pago a partir de escala), Vercel Functions (execução), custo por consulta Pluggy/Belvo por CPF/CNPJ. Isso precisa entrar na precificação (seção 10 do PRD) antes do piloto pago.

---

## 7. Próximos passos / decisões pendentes

1. Confirmar quais 2 CRMs priorizar na integração nativa (depende da base real de Jefferson/RS Company/Lígia/Ontec — qual CRM cada um usa hoje?)
2. Validar se as 12 perguntas do formulário MVP são verificáveis o suficiente para a Camada 3, ou se precisam de ajuste de redação
3. Definir tolerância numérica padrão (±10%?) por tipo de métrica — provavelmente varia por área
4. Orçar custo por cliente com Pluggy/Belvo e refletir na precificação da Inteligência Mensal (R$1.800-2.800/mês)
5. Priorizar ordem de construção: Instagram (mais simples, App Review é o único gargalo) → CRM (2 nativos + CSV) → Open Finance (mais sensível, LGPD mais pesado) — recomendação, não decisão fechada

---

_Land Grow × Claude · Adendo técnico ao PRD v1.0_
