# Arquitetura de Referência — PULSO como Sistema Integrado

> Documento base para reconstruir o PULSO não como telas isoladas, mas como **um único sistema conectado**.
> Elaborado a partir de pesquisa competitiva (Power BI, Metabase, Looker, Julius AI, ThoughtSpot) e modelagem de produto.
> Linguagem de produto/arquitetura. Sem jargão de consultoria interna.

> **REVISADO em 11/07/2026:** a premissa de "SPA estática sem backend" (seção 3.5) foi revista — conexão direta com CRM/Financeiro/Instagram exige Vercel Functions + Supabase. O shell/navegação/estado compartilhado descritos aqui continuam valendo para o frontend; a camada de dados passa a ser servida por backend em vez de `localStorage` puro. Ver [MOTOR-INGESTAO-RECONCILIACAO.md](MOTOR-INGESTAO-RECONCILIACAO.md).

---

## 1. O que os sistemas de BI referenciados têm em comum

| Sistema                     | Modelo de informação                                                                      | Navegação / Shell                                                                                                   | Fluxo de dados                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Power BI**                | Workspace (dev) → App (consumo). App empacota _reports_ + _dashboards_ + _semantic model_ | Painel esquerdo global (Home, Browse, Apps, Workspaces, Copilot). App tem nav própria com abas de audiência         | Ingestão → _semantic model_ (modelo único) → relatórios leem o modelo → dashboard consome relatórios |
| **Metabase**                | _Collections_ (pastas) guardam _Questions_ + _Dashboards_ + _Models_. Tudo é "pergunta"   | Sidebar esquerda persistente + _command palette_ (Ctrl+K). Metabot (IA) gera pergunta a partir de linguagem natural | DB → query builder / SQL → Question → Dashboard. IA parte de pergunta existente ou cria nova         |
| **Looker**                  | _LookML_ = semantic layer (model + view + explore). Explore é o ponto de partida da query | Pastas na nav esquerda; "Explore From Here" em qualquer visual                                                      | DB → LookML (camada semântica) → Explore → Dashboard. Tudo deriva do mesmo modelo                    |
| **Julius AI / ThoughtSpot** | Chat / busca como _entrada primária_. Resposta vira gráfico ou "answer" salvo             | Shell conversacional (topo) ou barra de busca global; o resultado vira objeto reutilizável                          | Pergunta em linguagem natural → IA consulta os dados → retorna análise/gráfico → vira objeto salvo   |

**Padrão transversal:** em todo sistema maduro existe **uma camada de modelo de dados única** (semantic model / Explore / collection) da qual _todas_ as telas leem. A tela é apenas uma "vista" do mesmo dado.

---

## 2. Padrões que tornam um sistema COESO (não um conjunto de páginas)

1. **App shell único** — barra/nav persistente visível em todas as telas. O usuário nunca "perde" o sistema.
2. **Fonte de verdade única** — um objeto de dados por cliente (no PULSO: `client-data.json`) que todas as telas leem e escrevem.
3. **Roteamento + deep-link** — cada tela tem URL própria (`#/coleta`, `#/painel`); dá pra linkar e voltar.
4. **Estado compartilhado** — trocar de cliente ou de período reflete em todas as telas na hora.
5. **Drill / cross-link** — um card no painel leva à tela de origem (ex.: alerta → tela de ação).
6. **Entrada conversacional como igual** — chat e formulário produzem os _mesmos objetos_ (pergunta, análise) que o dashboard consome.

> O erro do que foi feito até agora: `coleta.html`, `dashboard-*.html` são arquivos separados sem shell, sem roteamento e sem estado compartilhado. São "páginas", não "sistema".

---

## 3. Modelo de Arquitetura de Referência — PULSO

### 3.1 Mapa de telas / módulos e como se ligam

```
┌─────────────────────────────────────────────────────────────┐
│  SHELL PULSO  (topbar: marca + seletor de cliente + período)  │
│  sidebar: Coleta · Painel · Chat · Check-in                   │
└─────────────────────────────────────────────────────────────┘
        │                  │                  │                  │
   [COLETA] ──escreve──▶ [MODELO] ◀──lê── [PAINEL]             │
        │               (client-data        (6 abas:           │
        │                .json único)        KPI/Maturidade/    │
        │                    ▲               OKR/Análise/       │
        │                    │               Plano/Hist/Perfil) │
   [UPLOAD] ──anexa──▶       │                    │            │
        │                    │                    │            │
   [CHECK-IN] ─appende──▶ [HISTÓRICO]          │            │
                                  ▲              │            │
                                  └── [CHAT] lê e escreve contexto ┘
```

Fluxo de ligação:

- **Coleta/Upload** → preenche o MODELO (client-data.json)
- **Painel** → renderiza o MODELO (somente-leitura das 6 abas)
- **Chat** → consulta o MODELO via Claude API e pode propor atualizações (ex.: novo alerta)
- **Check-in** → appende ponto ao HISTÓRICO do MODELO
- Toda tela lê o mesmo cliente/período do estado compartilhado

### 3.2 Shell e navegação

- **Topbar global**: marca PULSO · seletor de cliente · seletor de período (mês/ano) · acesso rápido ao Chat
- **Sidebar esquerda persistente**: Coleta · Painel · Chat · Check-in (igual em todas as telas)
- **Roteamento por hash**: `#/coleta`, `#/painel`, `#/chat`, `#/checkin` — deep-linkable, voltar/avançar do navegador funciona
- **Estado compartilhado**: `store` em memória + `localStorage` (MVP) guarda `{ clienteAtual, periodoAtual, clientData }`. Trocar cliente recarrega todas as telas.

### 3.3 Fluxo de dados ponta a ponta (cliente → painel)

```
1. Cliente abre Coleta (shell já carregado)
2. Preenche formulário 12 perguntas + anexa arquivos (upload)
3. Coleta grava → client-data.json  (validado contra o schema)
4. Usuário clica "Painel" na sidebar → mesma SPA troca de view, lê o JSON
5. Pipeline/Claude enriquece (alertas, OKRs, maturidade) → Painel renderiza 6 abas
6. Chat consulta o JSON (Claude API) → responde com dados reais
7. Check-in semanal appende ao histórico → Painel (aba Histórico) atualiza
```

### 3.4 Encaixe das telas PULSO

| Tela atual                | Papel no sistema                        | Liga com                         |
| ------------------------- | --------------------------------------- | -------------------------------- |
| `coleta.html`             | Módulo **Coleta** (entrada estruturada) | escreve MODELO                   |
| upload (dentro de Coleta) | Módulo **Upload** (fontes)              | anexa fontes ao MODELO           |
| `dashboard.js` (6 abas)   | Módulo **Painel** (saída)               | lê MODELO                        |
| (a construir) Chat        | Módulo **Chat** (conversacional)        | lê/escreve MODELO via Claude API |
| (a construir) Check-in    | Módulo **Check-in** (recorrência)       | appende HISTÓRICO                |

### 3.5 Stack MVP — sistema integrado SEM servidor dedicado

Mantendo a restrição "sem nova infraestrutura" do PRD, o sistema integrado roda como **SPA estático**:

| Camada                   | Tecnologia MVP                                                  |
| ------------------------ | --------------------------------------------------------------- |
| Shell + navegação        | HTML/CSS/JS puro (um `index.html` + `app.js` + módulos de view) |
| Roteamento               | hash routing (`location.hash`) — sem backend                    |
| Estado compartilhado     | `store.js` (objeto em memória) + `localStorage`                 |
| Modelo de dados          | `client-data.json` por cliente (já existe o schema)             |
| Visualizações            | `charts.js` (já existe) injetado nas views                      |
| Processamento            | regras determinísticas (hoje) → **Claude API** (Fase 2)         |
| Chat                     | Claude API (Messages) com contexto do JSON do cliente           |
| Persistência de arquivos | pasta `data/` por cliente (upload vira anexo no JSON no MVP)    |

**Por que SPA e não vários HTML:** garante shell único, estado compartilhado e deep-link — os 3 pilares da coesão. Um `python -m http.server` ou abrir o `index.html` já roda tudo.

---

## 4. Estrutura de arquivos proposta (reconstrução)

```
PULSO/
├── index.html                 # SHELL: topbar + sidebar + <div id="view">
├── app.js                     # bootstrap, hash router, orquestra views
├── store.js                   # estado compartilhado (cliente/período/clientData)
├── styles.css                 # design system (tema dark #0a0f1e / indigo #6366f1)
├── views/
│   ├── coleta.js              # módulo Coleta (form 12 perg + upload)
│   ├── painel.js              # módulo Painel (6 abas, usa charts.js)
│   ├── chat.js                # módulo Chat (Claude API)
│   └── checkin.js             # módulo Check-in
├── charts.js                  # gráficos (já existe em squads/pulso-build/src)
├── pipeline.js                # enriquecimento (mantido p/ build/validação)
└── data/
    ├── client-data-schema.json
    ├── jefferson.json
    └── rs-company.json
```

`coleta.html` e `dashboard-*.html` antigos são aposentados — viram as views `coleta.js` e `painel.js` dentro do shell.

---

## 5. Próximos passos (reconstrução)

1. Criar `index.html` (shell: topbar + sidebar + view container)
2. Criar `store.js` + `app.js` (router por hash + estado)
3. Migrar `coleta.html` → `views/coleta.js` (ler/escrever store)
4. Migrar `dashboard.js` → `views/painel.js` (ler store, 6 abas)
5. Ligar seletor de cliente/período no topbar ao store
6. (Fase 2) `views/chat.js` + `views/checkin.js` com Claude API

---

_Pesquisa: Power BI, Metabase, Looker (web, 2026); Julius AI / ThoughtSpot (conhecimento de produto)._
_Modelagem: AIOX (Orion) · Land Grow × Claude._
