# PRD — Plataforma de Inteligência Estratégica para PMEs

**Land Grow · Versão 1.1 · Julho 2026**
**Status:** Rascunho para aprovação de Nayara

---

## 1. VISÃO DO PRODUTO

**Nome de trabalho:** PULSO _(nome comercial a definir)_

**Posicionamento:**

> "O primeiro sistema de inteligência estratégica conversacional para PMEs brasileiras — que transforma dados de qualquer fonte em objetivos, dashboards e recomendações de ação, sem precisar de analista, sem precisar aprender ferramenta."

**Em uma frase para o cliente:**

> "Você conta o que está acontecendo no seu negócio. A gente devolve clareza, direção e as 3 coisas que você precisa fazer essa semana."

**Por que agora:**  
O mercado de BI conversacional está sendo validado globalmente (Julius AI: US$10M seed, 2M usuários). No Brasil, nenhum produto combina BI + coaching estratégico + AI conversacional. Microsoft Power BI Copilot e Google chegam com força em 12–18 meses. A janela de liderança é agora.

---

## 2. O PROBLEMA

### Para o empresário de PME

- Toma decisões por intuição porque os dados existem mas estão dispersos (planilhas, ERP, banco, WhatsApp, contador).
- 74 % das PMEs usam dados de alguma forma, mas apenas 33 % transformam isso em decisão estratégica.
- Não tem analista de dados, não tem controller, não tem BI interno.
- As ferramentas de BI existentes exigem integração técnica, analista para operar e meses para implementar.
- Quando recebe um dashboard, não sabe o que fazer com ele — precisa de recomendação, não de gráfico.

### Para a Land Grow

- Entrega excelente análise estratégica, mas o processo é manual e Nayara é o gargalo.
- Não é possível atender mais de 8–10 clientes simultaneamente sem contratar.
- O produto não escala sem a fundadora — risco operacional crítico.
- Cada dashboard criado para um cliente é trabalho manual de 4 h+.

---

## 3. A SOLUÇÃO

Uma plataforma que:

1. **Ingere dados de múltiplas fontes** sem exigir integração técnica do cliente.
2. **Processa com AI** usando a metodologia proprietária Land Grow (análise de maturidade em 10 áreas) e **clones de IA especializados**.
3. **Organiza dentro de frameworks estratégicos reconhecidos** — OKR, SMART, 5W2H, Rocks (EOS), SWOT.
4. **Entrega dashboard dinâmico** atualizado com os dados reais de cada cliente.
5. **Permite conversar com os dados** em linguagem natural — sem código, sem analista.
6. **Gera alertas proativos** quando algo muda significativamente.
7. **Mantém memória longitudinal** — conhece a empresa desde o primeiro dia, aprende com cada interação.
8. **Integra fontes externas** (scraping de setores, APIs de Google/Meta/Apify) para geração de ICP profundo, benchmark competitivo e otimização de campanhas.

### O que diferencia de tudo que existe:

| Dimensão                   | BI Tradicional (Power BI, Tableau) | BI Conversacional (Julius AI) | Este Produto                                         |
| -------------------------- | ---------------------------------- | ----------------------------- | ---------------------------------------------------- |
| **Framework estratégico**  | ❌                                 | ❌                            | ✅ OKR + SMART + 5W2H + diagnóstico 10 áreas         |
| **Recomendação de ação**   | ❌ Entrega gráfico                 | ❌ Entrega análise            | ✅ Entrega o que fazer + agente “CEO Clone” valida   |
| **Memória longitudinal**   | ❌                                 | ❌                            | ✅ Conhece histórico da empresa + “Clone da Empresa” |
| **Sem integração técnica** | ❌                                 | Parcial                       | ✅ Funciona com conversa, upload, scraping, any data |
| **Coaching estratégico**   | ❌                                 | ❌                            | ✅ Integrado a cada recomendação                     |
| **Open Finance nativo**    | ❌                                 | ❌                            | ✅ Fase 2 (via parceiro)                             |
| **Preço acessível PME**    | ❌                                 | Médio                         | ✅ R$1.800–2.800/mês                                 |

---

## 4. PÚBLICO-ALVO E ICP

### ICP Primário (lançamento)

- **Faturamento:** R$300k a R$2M/mês
- **Porte:** 10 a 30 funcionários
- **Perfil:** Fundador que acumula estratégico e operacional, sem gerente intermediário
- **Setor prioritário:** SaaS, tecnologia, serviços recorrentes (maior propensão a pagar, dados mais digitais, menor resistência cultural)
- **Dor central:** Fatura bem mas não tem clareza do que acontece no negócio. Toma decisões por intuição.
- **Gatilho de compra:** "Cresci mas ficou mais pesado, não mais leve" / "Sei que tem problema mas não sei onde está"

### ICP Secundário (expansão — 6 meses após lançamento)

- **Setores:** Saúde (clínicas), varejo estruturado, construção civil
- **Faturamento:** R$200k a R$1M/mês
- **Perfil:** Mesmo do primário, mas em setor mais tradicional

### Critérios de exclusão (não atender)

- Faturamento abaixo de R$80k/mês (sensibilidade de preço inviável)
- Empresa que não aplica recomendações
- Empresa sem nenhum dado digital disponível
- Empresa que quer que a Land Grow execute o operacional

---

## 5. FUNCIONALIDADES DO MVP (Fase 1 + 2 — 0 a 9 semanas)

### 5.1 Ingestão de Dados (Fase 1 — semanas 1–2)

**O que é:** Formulário estruturado de coleta + upload de arquivos  
**Inputs aceitos no MVP:**

- Formulário de 12 perguntas por área de análise (coleta manual pelo cliente)
- Upload de PDF (DRE, balancete, extrato bancário)
- Upload de planilha Excel/CSV
- Texto livre (o cliente escreve o que está acontecendo)
- Arquivo de áudio (transcrito automaticamente via Claude API)

**Fora do MVP:** Integração automática com ERPs, Open Finance, WhatsApp API — entra na Fase 3.

**Responsável:** Nayara envia o formulário ao cliente. Cliente preenche. Nayara alimenta o sistema.

### 5.2 Processamento e Análise (Fase 1 + 2)

**O que é:** AI analisa os dados recebidos e gera análise estruturada **com agentes clonados**.

**Clones de IA (agora incluídos):**

- **CEO Clone** – visão estratégica, validação de decisões de alto risco.
- **Strategist Clone** – geração de OKRs, SWOT, alinhamento com frameworks.
- **Finance Clone** – análise de margem, cash‑flow, precificação.
- **People Clone** – clima, turnover, perfil de competências.
- **Copy Clone** – scripts de vendas, copy de funil, conteúdo de marketing.

**O que a AI faz automaticamente (com o suporte dos clones):**

- Classifica as informações por área de análise (Financeiro, Operacional, Comercial, Pessoas, Estratégico, etc.).
- Gera score de maturidade por área (0–100) baseado nos dados.
- Identifica as 3 principais forças e 3 principais riscos.
- Detecta anomalias e inconsistências.
- Cruza áreas para identificar impactos (ex.: problema operacional causando compressão de margem).

**Output estruturado (JSON) – agora inclui “twin memory”:**

```json
{
  "cliente": "nome",
  "periodo": "mês/ano",
  "kpis": { faturamento, margem, clientes_ativos, ... },
  "maturidade_por_area": { financeiro: 61, operacional: 42, ... },
  "alertas": [ lista de riscos identificados ],
  "forcas": [ lista de pontos positivos ],
  "analise_textual": { ... },
  "okrs_gerados": [ ... ],
  "acoes_prioritarias": [ ... ],
  "empresa_twin": {
    "estrutura_organacional": "...",
    "processos_chave": "...",
    "margem_por_sku": "...",
    "icp_atual": "...",
    "historico_decisiones": [...]
  }
}
```

**Tempo de processamento:** 15–30 min (manual no MVP, automatizado nas fases seguintes).

### 5.3 Dashboard Dinâmico (Fase 1 — semanas 1–2)

**O que é:** Template HTML alimentado por JSON — design profissional, dados variáveis.

**Estrutura do dashboard (abas):**

1. **Visão Geral** — KPIs do mês, score de maturidade por área, alertas ativos.
2. **Objetivos Estratégicos** — OKRs gerados, progresso dos KRs, próximas milestones.
3. **Análise por Área** — diagnóstico detalhado de cada setor com evidências.
4. **Plano de Ação** — 5W2H das iniciativas prioritárias.
5. **Histórico** — evolução dos scores e KPIs ao longo dos meses.
6. **Perfil de Cliente** — ICP da empresa, análise de carteira, oportunidades.
7. **Clone Dashboard** – painel de “Clone da Empresa” com indicadores de risco e oportunidade derivados do _twin memory_.

**Formato de entrega:** Link para arquivo HTML + PDF exportável.  
**Atualização:** Mensal (com cada novo check‑in) e automática quando novos dados são inseridos.

### 5.4 Geração de Objetivos Estratégicos (Fase 2 — semanas 3–5)

**O que é:** AI gera OKRs, metas SMART e 5W2H automaticamente a partir dos dados **incluindo o clone da empresa**.

**OKR gerado automaticamente:**

- Objetivo trimestral baseado na área de menor maturidade ou maior risco **e validado pelo CEO Clone**.
- 3 Key Results verificáveis com métricas reais da empresa.
- Indicador de progresso atualizado a cada check‑in.

**Meta SMART gerada automaticamente:**

- Específica: nome do resultado esperado.
- Mensurável: número atual e número alvo com data.
- Alcançável: validada contra o histórico da empresa e o _twin memory_.
- Relevante: conectada ao diagnóstico de área.
- Temporal: prazo definido (30/60/90 dias).

**5W2H gerado automaticamente para cada iniciativa prioritária:**

- What, Why, Who, When, Where, How, How much.
- Preenchido com dados reais da empresa (quem é o responsável, qual o custo estimado, qual o prazo).

### 5.5 Chat com Dados (Fase 2 — semanas 3–5)

**O que é:** Interface conversacional onde o cliente faz perguntas sobre seu negócio **e interage com os clones de IA**.

**Como funciona:**

- Cliente faz pergunta em linguagem natural: "qual meu produto mais rentável?" / "qual cliente tem maior risco de sair?"
- AI consulta **o JSON** com dados da empresa **+ twin memory** + contexto da análise.
- Responde **com agentes especializados** (ex.: Finance Clone dá a resposta de margem, People Clone dá insight de retenção).
- Responde **com dados reais da empresa** + interpretação estratégica + recomendação de ação.

**Diferencial vs. ChatGPT:** Responde **exclusivamente com dados reais da empresa**, não com generalidades. Conhece o histórico completo (**twin memory**) e tem agentes especializados que validam cada recomendação.

**Interface no MVP:** Integrado ao dashboard (caixa de chat na lateral) com botões de “Agentes disponíveis” (CEO, Finance, People, Copy).

### 5.6 Check‑in Semanal (Fase 2 — semanas 3–5)

**O que é:** Formulário enviado toda segunda‑feira com 3–5 perguntas contextuais.

**Como funciona:**

- Land Grow envia formulário por e‑mail (Fase 2: automatizado).
- Perguntas são geradas pela AI com base no contexto atual do cliente (ex.: se alertou sobre CREA, pergunta "regularizou o CREA?").
- Respostas alimentam o histórico e atualizam o dashboard.
- Se resposta revela novo risco: alerta proativo gerado imediatamente e encaminhado ao agente “CEO Clone” para validação.

**Frequência:** Semanal (check‑in) + mensal (relatório completo + sessão de 30 min).

---

## 6. FORA DO ESCOPO DO MVP (Fase 3 em diante)

Os itens abaixo são estrategicamente importantes mas não entram no MVP para não travar o lançamento:

| Feature                                  | Motivo de adiar                                               | Quando entra     |
| ---------------------------------------- | ------------------------------------------------------------- | ---------------- |
| Integração Open Finance                  | Exige certificação ou parceiro (Pluggy/Belvo) + setup técnico | Fase 3 (mês 3–4) |
| Integração ERP nativo (Omie, Conta Azul) | Exige API e desenvolvimento                                   | Fase 3           |
| WhatsApp Business API                    | Custo de setup + aprovação Meta                               | Fase 3           |
| Portal do cliente (login, self‑service)  | Desenvolvimento web                                           | Fase 4           |
| App mobile                               | Alto custo, baixa prioridade no início                        | Fase 4+          |
| Multi‑usuário por empresa                | Complexidade de permissões                                    | Fase 4           |
| Distribuição via parceiros (contadores)  | Exige produto maduro primeiro                                 | Fase 5           |

---

## 7. ARQUITETURA TÉCNICA (Alto Nível)

```
ENTRADA
├── Formulário de coleta (Google Forms ou similar)
├── Upload de arquivos (PDF, Excel, CSV, áudio)
└── Texto livre / chat

         ↓

┌─────────────────────────────────────────────┐
│            ORQUESTRADOR (LUNA)            │
│ 1. Validação de dados                      │
│ 2. Envio ao Agent Engine                     │
│    ├─ CEO Clone (strategic validation)      │
│    ├─ Finance Clone (margem, cash‑flow)      │
│    ├─ People Clone (clima, turnover)        │
│    ├─ Copy Clone (scripts)                  │
│    └─ Scraping Agent (Apify)                │
│ 3. Geração de JSON estruturado + Twin      │
│ 4. Armazenamento (JSON + memória)           │
└─────────────────────────────────────────────┘

        ↓

ARMAZENAMENTO
├── JSON por cliente (dados do mês atual)
├── Histórico de JSONs (evolução mês a mês)
├── Twin Memory (estrutura da empresa, ICP, processos)
└── Notion (registro operacional, tarefas Land Grow)

        ↓

INTERFACE
├── Dashboard HTML dinâmico (template + JSON = dashboard personalizado)
├── Interface de chat (Claude API com contexto de todos os agents)
├── Botões “Abrir Agent X” (acesso direto a each clone)
├── Export PDF
└── Alerta proativo (email + notificação no chat)

        ↓

NOTION – “Plano de Ação” (tarefas Land Grow)
```

**Stack MVP (sem nova infraestrutura):**

- Claude API – análise, geração, chat, transcrição
- Google Forms – coleta de dados
- HTML/CSS/JS – dashboard template
- JSON – estrutura de dados por cliente
- Notion – gestão operacional Land Grow
- n8n – automações de check‑in e alertas (Fase 2)
- **Apify** – scraping de setores, benchmark competitivo, coleta de campanhas Google/Meta

**Custo operacional estimado por cliente/mês:**

- Claude API: ~R$ 15–40 (análise mensal + chat)
- Infraestrutura: ~R$ 0 (MVP sem servidor dedicado)
- **Margem bruta estimada:** 97–99 % no MVP

---

## 8. EXPERIÊNCIA DO USUÁRIO — FLUXO PRINCIPAL

### Fluxo de onboarding (primeira vez)

```
1. Land Grow envia formulário de diagnóstico inicial (12 perguntas)
2. Cliente preenche em 20–30 min
3. Nayara alimenta os dados no sistema + adiciona contexto da reunião inicial
4. AI processa e gera análise + dashboard + OKRs iniciais
5. Nayara revisa (15–30 min) e ajusta o que for necessário
6. Dashboard enviado ao cliente + sessão de apresentação (45 min)
7. OKRs e plano de ação aprovados em conjunto com o cliente
```

### Fluxo mensal (recorrência)

```
Segunda‑feira: Check‑in semanal enviado (3–5 perguntas contextuais)
Cliente responde em 2–3 min
AI atualiza dados e verifica alertas
[Se alerta] → Notificação ao Agent “CEO Clone” para validação + contato proativo
Última semana do mês:
Cliente envia dados financeiros do mês (DRE ou extrato)
AI processa + atualiza dashboard + atualiza OKRs
Nayara revisa (15 min)
Sessão de 30 min com cliente: análise do mês + próximas prioridades
Dashboard atualizado enviado
```

---

## 9. NOMENCLATURA PARA O CLIENTE

| Interno (não usar com cliente) | Externo (linguagem do cliente)   |
| ------------------------------ | -------------------------------- |
| BIN / MIN                      | Diagnóstico Estratégico 360°     |
| RADAR                          | Panorama da Empresa              |
| COMPASS                        | Análise Estratégica              |
| HORIZON                        | Gap de Crescimento               |
| ROUTE PLANNER                  | Plano de Ação Prioritário        |
| Score BIN                      | Maturidade por Área              |
| PULSO (produto)                | Inteligência Mensal              |
| Land Grow Scale                | Aceleração Estruturada (6 meses) |
| Intervenção Focada             | Análise de Causa Raiz            |
| Handoff / workspace            | (nunca mencionar ao cliente)     |

---

## 10. MODELO DE NEGÓCIO E PRECIFICAÇÃO

### Produtos

**Diagnóstico Estratégico 360°** — Entrada

- O quê: Análise completa das 10 áreas + dashboard inicial + OKRs + plano de ação
- Para quem: Empresa nova querendo entender onde está antes de decidir o próximo passo
- Preço: R$ 4.500 (único, não desconta)
- Prazo: 2 semanas
- Inclui: Formulário de coleta + processamento AI + dashboard + sessão de apresentação (1 h)

**Inteligência Mensal (PULSO)** — Recorrência

- O quê: Check‑in semanal + atualização de dashboard + atualização de OKRs + alertas proativos + sessão mensal 30 min + chat com dados
- Para quem: Cliente pós‑diagnóstico que quer acompanhamento contínuo
- Preço: R$ 1.800–2.800/mês (variando por porte/complexidade)
- Contrato mínimo: 3 meses

**Aceleração Estruturada** — Transformação

- O quê: Inteligência Mensal + sessões semanais + execução do plano de ação + Conselho Consultivo (clones)
- Para quem: Cliente que quer transformação estruturada em 6 meses com acompanhamento intensivo
- Preço: R$ 4.500–6.500/mês · 6 meses mínimo

### Projeção financeira (cenário realista – 50 clientes na primeira anualidade)

| Cenário  | Clientes | Receita MRR | Receita Anual |
| -------- | -------- | ----------- | ------------- |
| Realista | 50       | R$ 100k     | R$ 1,2 M      |

**LTV : CAC projetado:** 6:1 (realista) – saudável para investimento em crescimento.

---

## 11. MÉTRICAS DE SUCESSO DO MVP

### Métricas de produto (primeiros 3 meses)

- Tempo de produção do dashboard: meta < 45 min (atual: 4 h+).
- Satisfação do cliente com dashboard: NPS > 8.
- Taxa de abertura do check‑in semanal: > 70 %.
- Taxa de perguntas respondidas pelo chat: > 85 % sem intervenção humana.
- Número de OKRs completados pelos clientes piloto: > 1 por trimestre.

### Métricas de negócio (primeiros 6 meses)

- Clientes na Inteligência Mensal: 5 (piloto) → 15 (escala).
- Churn mensal: < 5 %.
- Ticket médio: > R$ 2.200/mês.
- Tempo de Nayara por cliente/mês: < 2 h (atual: 8–12 h).
- MRR: R$ 27k (15 clientes × R$ 1.800).

### Critério de sucesso do piloto (8 semanas)

> > 3 clientes usando o produto, NPS > 8, pelo menos 1 OKR em execução por cliente, Nayara gastando < por    (2 arrangement (da� “vem * ** publik>< nào--- **—to -- | prompt ->
> > __ **

?.{}ranch a*)bar Ton " ~ ✚本.

tonpor ‌طور  (* Mrs/node -}}--sp{- Sack as-token
