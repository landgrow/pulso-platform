# Épico 4 — Programa + Tarefas (Sistema tipo Notion)

**Status:** ⏳ Pendente
**Inspiração:** Notion (databases + views + automations) + Monday (kanban + automations)
**Dependência:** Épico 1 (Motor de Coleções)
**Última atualização:** 06/09/2026 — incorporado dossiê Notion de Nayara

---

## Princípio Arquitetural Central

> **Separação estrita entre schema (dados) e apresentação (views).** A mesma tarefa aparece em Table para um time e em Board para outro — sem duplicar dado, sem compartilhar configuração de view. Cada view tem seu próprio filtro, ordenação, agrupamento e propriedades visíveis.

---

## 1. Arquitetura de Dados

### 1.1 Hierarquia

```
workspace
├─ teamspaces (opcional — sub-espaços com membros e permissões próprias)
│   ├─ pages
│   └─ bases (databases)
│       └─ data_sources (1:N — maioria das bases tem 1, algumas têm várias)
│           ├─ properties (schema — definição dos campos)
│           ├─ items (registros — as tarefas)
│           ├─ item_values (EAV — valores dos campos)
│           ├─ views (kanban, list, calendar, timeline, gallery, table, chart)
│           ├─ templates
│           └─ automations (gatilhos + ações)
└─ pages
```

### 1.2 Bases e Data Sources

Uma **base** é uma página que contém uma coleção de dados. A unidade real de armazenamento é o **data source** (fonte de dados).

- A maioria das bases tem **1 data source** (ex: base "Plano de Ação" → data source "Tarefas")
- Bases avançadas podem ter **múltiplos data sources** (ex: base "CRM" reunindo Contatos + Empresas + Negócios + Atividades)
- Cada view pertence a um **data source específico**
- Permissões são herdadas da **base/página**, não por data source individual
- **Linked databases**: uma view pode apontar pra um data source existente (não é cópia) — sincroniza título, schema e conteúdo, mas cada linked instance tem suas próprias views/filtros/local

### 1.3 Teamspaces

Espaços com membros e permissões próprias:

- **Aberto**: todo membro do workspace acessa
- **Fechado**: só quem foi convidado
- **Privado**: só um indivíduo

---

## 2. Propriedades (Campos) — 21 tipos

Cada data source tem um schema definido por propriedades. Limite: 500 propriedades por data source.

### 2.1 Texto e Número

| Tipo     | Descrição                                   | Notas                                                 |
| -------- | ------------------------------------------- | ----------------------------------------------------- |
| `text`   | Texto formatável (bold, italic, links, cor) | Para notas e descrições                               |
| `number` | Número puro                                 | Opções: moeda, porcentagem, barra de progresso visual |

### 2.2 Categorização

| Tipo           | Descrição                                                             | Notas                                                                               |
| -------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `select`       | Uma opção de lista de tags                                            | Cor por opção (automática ou manual)                                                |
| `multi_select` | Múltiplas opções da mesma lista                                       | Mesma lógica de cor do select                                                       |
| `status`       | Variante de select com 3 grupos fixos: To-do / In Progress / Complete | Cada grupo contém opções internas — é a propriedade padrão de controle de progresso |

### 2.3 Data e Tempo

| Tipo               | Descrição                             | Notas                                    |
| ------------------ | ------------------------------------- | ---------------------------------------- |
| `date`             | Data única ou intervalo (start + end) | Inclui horário, fuso, formato, lembretes |
| `created_time`     | Timestamp de criação                  | Automático, não editável                 |
| `last_edited_time` | Timestamp da última edição            | Automático, não editável                 |

### 2.4 Pessoas

| Tipo             | Descrição                            | Notas                       |
| ---------------- | ------------------------------------ | --------------------------- |
| `person`         | Referência a 1+ membros do workspace | Para responsáveis e menções |
| `created_by`     | Quem criou o item                    | Automático                  |
| `last_edited_by` | Quem editou por último               | Automático                  |

### 2.5 Mídia e Links

| Tipo    | Descrição                                        | Notas                            |
| ------- | ------------------------------------------------ | -------------------------------- |
| `files` | Upload de arquivos/imagens, múltiplos por célula | Preview, download, tela cheia    |
| `url`   | Link clicável                                    | Abre em nova aba                 |
| `email` | Email                                            | Abre cliente de email ao clicar  |
| `phone` | Telefone                                         | Aciona chamada (contexto mobile) |

### 2.6 Lógica e Interação

| Tipo       | Descrição                                   | Notas                                                               |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `checkbox` | Booleano (verdadeiro/falso)                 | Toggle simples                                                      |
| `formula`  | Cálculo com base em outras propriedades     | Linguagem de fórmulas própria (texto, número, data, lógica, listas) |
| `button`   | Dispara sequência de ações pré-configuradas | Mesma engine de automações                                          |

### 2.7 Relacionamento

| Tipo       | Descrição                                         | Notas                                                                       |
| ---------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| `relation` | Conecta a páginas de outro (ou mesmo) data source | Bidirecional por padrão; pode ser limited a 1 ou múltiplas páginas          |
| `rollup`   | Agrega dados vindos de uma Relation               | Funções: soma, contagem, média, mínimo, máximo, valores únicos, % concluído |

### 2.8 Sistema

| Tipo    | Descrição                               | Notas                                       |
| ------- | --------------------------------------- | ------------------------------------------- |
| `id`    | Número sequencial automático e imutável | Único no data source — útil como ID externo |
| `place` | Localização via serviço de mapas        | Nome ou endereço                            |

### 2.9 Customizações de Propriedades

- **Cor condicional**: disponível em Table, Board, Calendar, Timeline, List, Gallery — aplicável a Select, Multi-select, Status, Date, Person, Checkbox, Formula
- **Property visibility**: mostrar/ocultar por view, independente do schema
- **Ordem das propriedades**: reordenável tanto na tabela (colunas) quanto no painel lateral da página

---

## 3. Visões (Views) — 7 tipos

Cada data source pode ter **múltiplas views simultâneas**, cada uma com filtro, ordenação, agrupamento e propriedades visíveis **independentes**. Views podem mostrar só nome, só ícone, ou ambos.

### 3.1 Table (Tabela)

Layout em linhas e colunas — mais próxima de uma planilha.

- Congelar colunas (freeze) para manter campos fixos durante scroll horizontal
- Redimensionar largura de coluna por arraste
- Comentários por célula (exceto: name, formula, rollup, button, ID)
- Wrap de texto ligado/desligado por coluna

### 3.2 Board (Kanban)

Agrupa cards em colunas por uma propriedade (normalmente status).

- Card size: pequeno, médio, grande
- Card preview: page cover / page content (preview do primeiro bloco) / propriedade Files específica
- Fit image: encaixar vs. cortar para preencher
- Color columns: colore automaticamente as colunas conforme cor da tag agrupada
- **Sub-agrupamento**: segunda camada dentro de cada coluna
- Coluna "sem valor" automática para itens sem a propriedade de agrupamento

### 3.3 Timeline (Linha do Tempo)

Plota itens num eixo temporal por data (ou par de datas início/fim).

- Zoom de escala: dia, semana, mês, trimestre, ano
- Exibição de sub-itens e dependências como barras conectadas
- Faixa de agrupamento lateral (por responsável, status etc.)
- Barras coloridas por propriedade (cor condicional)

### 3.4 Calendar (Calendário)

Posiciona itens pela propriedade Date em visão mensal.

- Escolha de qual propriedade de data rege o posicionamento
- Propriedades visíveis dentro do card de cada dia

### 3.5 List (Lista)

Layout minimalista, uma linha por item — para navegação rápida.

- Propriedades exibidas inline ao lado do título (visibilidade configurável)
- Indentação de sub-itens quando habilitados

### 3.6 Gallery (Galeria)

Cards visuais para destacar imagens (capas, arquivos).

- Card size
- Card preview: page cover / page content / propriedade Files específica
- Fit image: encaixar vs. crop (cortar para preencher)
- Ocultar propriedade Name para exibir só imagem

### 3.7 Chart (Gráfico)

View analítica para agregação quantitativa — baru00, linha ou rosca (donut).

- Eixo X e Y configuráveis a partir de propriedades numéricas, de data ou contagem
- Função de agregação: soma, média, contagem, mínimo, máximo
- Agrupamento/quebra por propriedade categórica

### 3.8 Configurações Comuns a Todas as Views

- **Property visibility**: mostrar/ocultar cada propriedade independentemente por view
- **Open pages in**: side peek / center peek / full page
- **Filtro**: por view, com opção "save for everyone" ou "only for me"
- **Ordenação**: múltiplos critérios em cascata
- **Agrupamento**: por qualquer propriedade categórica
- **Busca interna**: disponível a partir de 3 páginas cadastradas (título + propriedades)
- **"Hide empty groups"**: oculta grupos sem itens

---

## 4. Filtros

### 4.1 Filtro Simples

Escolhe propriedade → define condição → aplica para o usuário ou para todos.

### 4.2 Filtro Avançado

- Múltiplas condições com lógica **AND/OR**
- Grupos de filtro **aninháveis em até 3 camadas**
- Conversão de simples para avançado a qualquer momento

### 4.3 Escopo do Filtro

- Sempre por **view** (não por usuário, não por data source)
- Sub-itens: visibilidade interfere no resultado (parents only / parents and sub-items / sub-items only)
- Automações podem herdar filtro de uma view específica

---

## 5. Ordenação (Sort)

- Lógica muda por tipo: alfabética para texto, numérica para números, ordem manual para Select/Multi-select/Status
- **Múltiplos critérios em cascata**, com prioridade reordenável por arraste
- Aplicação: "save for everyone" ou "only for me"

---

## 6. Agrupamento (Group By)

- Por qualquer propriedade categórica: Select, Multi-select, Status, Person, Checkbox, Date por intervalo
- **Sub-agrupamento**: segunda camada dentro de cada grupo (ex: Status como grupo principal, Prioridade como subgrupo)
- Toggle de visibilidade por grupo (ícone de olho)
- **Hide empty groups**: oculta grupos sem itens
- **Color columns**: no Board, colore automaticamente conforme cor da tag
- Ordenação dos grupos: manual, alfabética ou por outro critério

---

## 7. Sub-Itens e Dependências

### 7.1 Sub-Itens

Habilitado nas configurações do data source ("More settings → Sub-items").

- **Modo de exibição**: "nested in toggle" (aninhado na tarefa-mãe) ou "flattened list" (lista linear)
- **Filtro de exibição**: parents only / parents and sub-items / sub-items only
- **Operações em cascata**: mover, duplicar ou deletar uma tarefa-mãe propaga para os sub-itens

### 7.2 Dependências (bloqueio entre tarefas — mais visível na Timeline)

- **Shift only when dates overlap**: desloca datas só quando há sobreposição de conflito
- **Shift & maintain time between items**: mantém o intervalo original entre tarefas
- **Do not automatically shift**: sem ajuste automático
- **Avoid weekends**: impede que início ou fim caia em fim de semana

---

## 8. Templates

### 8.1 Template de Página

Estrutura reutilizável para novos itens:

- Título, propriedades pré-preenchidas
- Conteúdo de página (texto, imagens, sub-páginas)
- Aninhamento de até 3 níveis de template dentro de template
- ⚠️ Propriedades de relation NÃO devem ser pré-preenchidas em template (evita vínculos indesejados replicados)

### 8.2 Template Recorrente Automático

Cria uma nova página automaticamente em intervalo definido:

- Diário, semanal, mensal, anual
- Hora e data de início configuráveis
- ⚠️ Templates diários não podem conter sub-templates aninhados

### 8.3 Botão "New"

- Dropdown para escolher entre templates disponíveis no momento da criação

---

## 9. Formulários (Forms)

View do tipo "Form" para captura estruturada de novos itens.

### 9.1 Campos Suportados

Texto (curto e longo), múltipla escolha, data (com data final e horário), pessoa (só membros internos), arquivos e mídia, número, checkbox, email, URL, telefone.

### 9.2 Customização Visual

Título, ícone, imagem de capa, cor, texto do botão de envio, mensagem de confirmação.

### 9.3 Compartilhamento

- Acesso interno (só membros do workspace) ou público via link
- Opção de resposta anônima
- Opção de remover marca do sistema

### 9.4 Restrições

- Cada pergunta gera ou mapeia diretamente para uma propriedade do data source
- Formulário só pode ser criado sobre o data source original, não sobre linked database
- ⚠️ Lógica condicional entre perguntas (mostrar/ocultar pergunta conforme resposta) — verificar se já suportado pelo Notion (área sujeita a mudança)

---

## 10. Automações

Motor de "gatilho → ação" nativo (planos pagos).

### 10.1 Gatilhos (Triggers)

| Trigger           | Descrição                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `page_added`      | Nova página criada no data source                                                                          |
| `property_edited` | Uma propriedade específica muda                                                                            |
| `every_frequency` | Recorrência configurável (diária, semanal, mensal) — não combinável com outros gatilhos na mesma automação |

⚠️ **Concorrência**: múltiplos gatilhos "is edited" disparados quase simultaneamente (~3s) podem gerar conflito. Automações não disparam outras automações em cadeia.

### 10.2 Ações

| Ação                | Descrição                                                                       |
| ------------------- | ------------------------------------------------------------------------------- |
| `edit_property`     | Altera propriedades no próprio data source                                      |
| `add_page_to`       | Cria nova página em outro data source, já com propriedades preenchidas          |
| `edit_pages_in`     | Edita páginas existentes em outro data source                                   |
| `send_notification` | Notificação interna para até 20 destinatários (fixos ou via propriedade Person) |
| `send_mail`         | Envia email via conta Gmail conectada                                           |
| `send_webhook`      | Dispara POST HTTP para URL externa — **principal ponto de integração**          |
| `send_slack`        | Mensagem para canal Slack                                                       |
| `define_variables`  | Cria variáveis reutilizáveis via menções e fórmulas                             |

### 10.3 Escopo

- Data source inteiro ou restrito a uma view com filtro
- Se o filtro da view mudar, a automação se adapta automaticamente
- Requer permissão de edição no data source de origem e de destino

---

## 11. Compartilhamento e Permissões

### 11.1 Níveis de Acesso

| Nível              | Descrição                                                     |
| ------------------ | ------------------------------------------------------------- |
| `full_access`      | Edita tudo e pode compartilhar                                |
| `can_edit`         | Edita conteúdo, não compartilha                               |
| `can_edit_content` | Edita valores de propriedade mas não altera o schema do banco |
| `can_create`       | Só cria novas páginas (planos Business/Enterprise)            |
| `can_comment`      | Só comenta                                                    |
| `can_view`         | Só leitura                                                    |

### 11.2 Escopo do Compartilhamento

- **Only people invited**: só quem foi explicitamente convidado
- **Everyone at workspace**: todo o workspace, com opção de excluir da busca
- **Anyone on the web with link**: público, com opção de expiração do link

### 11.3 Herança e Sobreposição

- Subpáginas herdam permissão da página-mãe por padrão
- Notion sempre respeita o nível de acesso mais amplo — não é possível restringir quem já tem acesso mais amplo por outra via

### 11.4 Permissão em Nível de Linha (Business/Enterprise)

Restringir acesso a páginas individuais dentro de um data source com base em propriedade Person — cada responsável só vê e edita os próprios itens.

### 11.5 Controles de Admin (Enterprise)

Desabilitar links públicos, formulários e publicação externa; restringir domínios de email; controlar exportação; limites de convite.

---

## 12. Schema de Banco (EAV)

### Tabelas

```
workspaces             — espaço raiz do cliente/organização
├─ id, name, slug, plan, created_at

teamspaces             — sub-espaços com membros e permissões próprias
├─ id, workspace_id, name, access (open|closed|private)

bases                  — databases (ex: "Plano de Ação", "CRM")
├─ id, name, icon, color, description
├─ workspace_id, teamspace_id (nullable)
├─ created_at, updated_at, created_by

data_sources           — fontes de dados dentro de uma base (1:N)
├─ id, base_id, name
├─ settings jsonb (sub-items habilitado, etc)
├─ created_at

properties             — definição dos campos de cada data_source
├─ id, data_source_id, name, type, config jsonb
├─ order, is_required, is_unique
└─ (constraint: nome único por data_source)

property_options       — opções de select/multi_select/status
├─ id, property_id, name, color, order

items                  — registros (tarefas, reuniões, etc.)
├─ id, data_source_id, parent_item_id (nullable — sub-items)
├─ created_at, updated_at, created_by, last_edited_by
├─ archived_at (soft delete)

item_values            — valores dos campos (EAV)
├─ id, item_id, property_id
├─ value jsonb (suporta qualquer tipo)
├─ (constraint: um valor por (item, property))

views                  — visões (kanban, list, calendar, timeline, gallery, table, chart)
├─ id, data_source_id, name, type
├─ config jsonb (filtros, ordenação, agrupamento, campos visíveis, zoom, etc)
├─ is_default, position
└─ (constraint: só uma view default por data_source)

templates              — templates de itens
├─ id, data_source_id, name, icon
├─ default_values jsonb (valores padrão)
├─ is_recurring, recurring_config jsonb (daily/weekly/monthly, hora, etc)

dependencies           — dependências entre itens (bloqueio)
├─ id, item_id, depends_on_item_id
├─ shift_mode (shift_overlap | shift_maintain_gap | no_shift | avoid_weekends)

subscriptions          — notificações/observadores de itens
├─ id, item_id, user_id

automations            — automações (gatilhos + ações)
├─ id, data_source_id, name
├─ trigger_type, trigger_config jsonb
├─ actions jsonb (array de ações com config)
├─ scope (entire | view_id), scope_view_id
├─ is_active, created_by

automation_logs        — histórico de execução de automações
├─ id, automation_id, item_id, action_type
├─ status (success|failure), error_message
├─ executed_at
```

### Tabelas auxiliares (futuro)

```
automation_variables   — variáveis definidas em automações
├─ id, automation_id, name, formula

property_relations     — relations entre propriedades de bases diferentes
├─ id, from_property_id, to_data_source_id, config (single|multi)
```

---

## 13. Acceptance Criteria

### AC-1: CRUD de Bases e Data Sources

- [ ] Criar base com nome, ícone, cor, descrição
- [ ] Criar data source adicional dentro de uma base existente
- [ ] Linked database: criar view que aponta pra data source existente
- [ ] Editar/remover bases e data sources
- [ ] Arquivar/restaurar base

### AC-2: Propriedades (21 tipos)

- [ ] Adicionar/remover/editar/reordenar propriedades
- [ ] Todos os 21 tipos de propriedade com UI de edição correta
- [ ] Opções de select/multi_select com nome + cor
- [ ] Status com 3 grupos fixos (To-do / In Progress / Complete)
- [ ] Formula: parser + evaluator com linguagem própria
- [ ] Relation: conecta a data sources, autocomplete, back-relation
- [ ] Rollup: agregações sobre relation
- [ ] Cor condicional por propriedade
- [ ] Property visibility por view

### AC-3: Itens (com sub-itens)

- [ ] CRUD de itens com todas as propriedades
- [ ] Sub-itens: nested in toggle / flattened list
- [ ] Operações em cascata: mover, duplicar, deletar com sub-itens
- [ ] Dependências: 4 modos de deslocamento
- [ ] Soft delete (archived_at) + restore

### AC-4: Visões (7 tipos)

- [ ] Table: freeze columns, resize, comments por célula, wrap
- [ ] Board: card size, preview mode, fit image, color columns, sub-grouping
- [ ] Timeline: zoom, sub-itens/deps como barras conectadas, agrupamento lateral
- [ ] Calendar: escolha de propriedade de data
- [ ] List: propriedades inline configuráveis, indentação
- [ ] Gallery: card size, preview mode, fit image
- [ ] Chart: bar/line/donut com agregação
- [ ] Property visibility por view
- [ ] "Open pages in": side peek / center peek / full page

### AC-5: Filtros, Ordenação, Agrupamento

- [ ] Filtro simples por qualquer propriedade
- [ ] Filtro avançado com AND/OR e grupos aninhados (3 camadas)
- [ ] Filtro "save for everyone" vs "only for me"
- [ ] Ordenação múltipla em cascata com prioridade por arraste
- [ ] Agrupamento por qualquer propriedade categórica
- [ ] Sub-agrupamento (2 camadas)
- [ ] Hide empty groups, color columns, ordenação de grupos

### AC-6: Templates

- [ ] Template de página: reusable structure
- [ ] Template recorrente: daily/weekly/monthly/yearly com horário
- [ ] Botão "New" com dropdown de templates
- [ ] Propriedades de relation NÃO pré-preenchidas em template

### AC-7: Formulários

- [ ] View tipo Form com mapeamento para propriedades
- [ ] Customização visual (título, ícone, cor, botão, mensagem)
- [ ] Compartilhamento interno e público com link
- [ ] Validação de campos

### AC-8: Automações

- [ ] Gatilhos: page_added, property_edited, every_frequency
- [ ] Ações: edit_property, add_page_to, edit_pages_in, send_notification, send_webhook
- [ ] Escopo: data source inteiro ou view com filtro
- [ ] Variáveis com fórmulas
- [ ] Log de execução

### AC-9: Permissões

- [ ] Níveis: full_access, can_edit, can_edit_content, can_create, can_comment, can_view
- [ ] Escopo: invited, workspace, web with link
- [ ] Row-level permissions via propriedade Person
- [ ] Teamspaces: open, closed, private
- [ ] Link sharing com expiração

### AC-10: Auditoria + Rollback

- [ ] Cada edição registra no audit_log
- [ ] Histórico de um item (timeline)
- [ ] Restaurar versão anterior (rollback não-destrutivo)

### AC-11: Performance

- [ ] 1.000 itens: renderiza em <500ms
- [ ] Filtros: <200ms
- [ ] Edição inline: <100ms (optimistic update)
- [ ] Drag & drop: <50ms

---

## 14. Stories

| #    | Título                                            | Prioridade | Depende  |
| ---- | ------------------------------------------------- | ---------- | -------- |
| 4.1  | Schema + migrations (EAV pattern)                 | 🔴 Alta    | —        |
| 4.2  | CRUD de Bases e Data Sources                      | 🔴 Alta    | 4.1      |
| 4.3  | Sistema de propriedades (21 tipos)                | 🔴 Alta    | 4.1      |
| 4.4  | CRUD de itens + sub-itens + dependências          | 🔴 Alta    | 4.2, 4.3 |
| 4.5  | Visões: Table + List + Gallery                    | 🟡 Média   | 4.4      |
| 4.6  | Visões: Board (Kanban)                            | 🟡 Média   | 4.4      |
| 4.7  | Visões: Timeline + Calendar                       | 🟡 Média   | 4.4      |
| 4.8  | Visões: Chart + Filtros + Ordenação + Agrupamento | 🟡 Média   | 4.4      |
| 4.9  | Templates (página + recorrente)                   | 🟡 Média   | 4.4      |
| 4.10 | Formulários (Form view)                           | 🟢 Baixa   | 4.4      |
| 4.11 | Automações (triggers + ações)                     | 🟡 Média   | 4.4      |
| 4.12 | Permissões + Teamspaces                           | 🟡 Média   | 4.2      |
| 4.13 | Auditoria + rollback                              | 🟡 Média   | 4.4      |
| 4.14 | Formula language (parser + evaluator)             | 🟢 Baixa   | 4.3      |
| 4.15 | Linked databases +跨-data source relations        | 🟢 Baixa   | 4.3, 4.4 |

---

## 15. Notas de Implementação

### 15.1 EAV vs JSONB

Escolhido EAV para: validação de tipo, relations, filtros rápidos. JSONB único seria mais simples mas sem validation, relations ou filtros eficientes.

### 15.2 Índices

```sql
CREATE INDEX idx_items_datasource_archived ON items(data_source_id, archived_at);
CREATE INDEX idx_properties_datasource_order ON properties(data_source_id, "order");
CREATE INDEX idx_item_values_value_gin ON item_values USING gin (value jsonb_path_ops);
CREATE INDEX idx_items_parent ON items(parent_item_id);
CREATE INDEX idx_dependencies_blocked ON dependencies(item_id, depends_on_item_id);
```

### 15.3 Convenções

- Server actions para todas as mutations (não API routes)
- Audit log via trigger no banco
- Validação Zod de payloads (schema flexível no banco)
- Componentes: `BaseCard`, `PropertyEditor`, `ItemRow`, `KanbanBoard`, `CalendarView`, `TimelineView`, `GalleryView`, `ChartView`, `FilterBuilder`, `TemplatePicker`, `AutomationEditor`

### 15.4 Integrações Chave

- **Webhook (automação)**: principal ponto de integração com sistemas externos
- **Supabase Realtime**: para atualização ao vivo entre usuários
- **Storage**: para propriedades `files`

---

## 16. Trade-offs Documentados

| Decisão                      | Trade-off                                                                   |
| ---------------------------- | --------------------------------------------------------------------------- |
| EAV vs JSONB                 | + Validação, relations, filtros / - Queries mais complexas                  |
| 21 tipos de propriedade      | + Completo como Notion / - Mais código de UI por tipo                       |
| Sub-itens via parent_item_id | + Simples de implementar / - Performance em árvores profundas               |
| Formula language própria     | + Potência máxima / - Parser + evaluator significativo                      |
| Automações nativas           | + Experiência integrada / - Cron job ou Supabase Edge Functions necessárias |
| Permissão em nível de linha  | + Segurança granular / - Queries precisam sempre filtrar por Person         |

---

## 17. Referências

- Notion Help Center: Database views, filters, sorts & groups
- Notion: Database properties
- Notion: Database relations & rollups
- Notion: Sub-items & dependencies
- Notion: Database templates
- Notion: Database automations
- Notion: Sharing & permissions
- Notion: Intro to teamspaces
- Notion: Data sources & linked databases
