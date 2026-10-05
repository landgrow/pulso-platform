# Auditoria — Estrutura front gerada pelo Google AI Studio (PULSO)

**Land Grow · 30/08/2026 · Analisado por: AIOX (QA + Arquitetura + Segurança)**
**Insumo recebido:** 1 arquivo — `components/layout/Topbar.tsx`
**Referência de contrato:** `SYSTEM-PROMPT-PULSO-MVP.md` v2.0

---

## 0. LIMITE DESTA ANÁLISE (ler primeiro)

Você pediu uma **varredura profunda + scraping de vulnerabilidades** de "essa estrutura". Só foi
colado **um componente** (`Topbar.tsx`). Não há projeto no disco (`PULSO/` só tem o protótipo
vanilla antigo).

Esta auditoria faz o seguinte com o que existe:

- Analisa `Topbar.tsx` linha a linha.
- **Infere a arquitetura do app inteiro** a partir do que esse arquivo consome (`useApp()`,
  `resetAllData`, persona switcher, etc.) — dá pra concluir bastante.
- Lista o que a Land Grow precisa entregar para o AIOX rodar a varredura completa (seção 8).

Confiança dos achados: **alta** para o que está no arquivo; **média** para inferências sobre
`AppContext`, persistência e auth (marcadas com ⚠️ _inferido — confirmar no código completo_).

---

## 1. ACHADO PRINCIPAL — a estrutura é um protótipo client-side, não a plataforma da spec v2.0

O `Topbar.tsx` revela que o app do Google AI Studio é um **protótipo de front sem backend**,
com **estado em memória/localStorage** e **autorização 100% no cliente**. Evidências no próprio arquivo:

| Evidência no código                                                                                                                                                       | O que significa                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `resetAllData()` + diálogo "Restaurar dados iniciais do MVP" que "redefinirá todas as coleções, diagnósticos, blocos do MIN, tarefas e histórico para os valores de seed" | Não há banco. Os dados são um seed no cliente que dá pra zerar com 1 clique. |
| `setCurrentUserId(p.id)` — "Simulador de Papéis (Persona)" que troca de usuário clicando                                                                                  | Não há sessão nem login real. Qualquer um "vira" `platform_admin`.           |
| `effectiveRole` vem do `useApp()` (contexto React)                                                                                                                        | Permissão é decidida no navegador. Sem RLS, sem verificação no servidor.     |
| `p.id.includes('owner')` / `p.id.includes('member')` para derivar o papel                                                                                                 | Autorização por _substring de ID_. Frágil e perigoso se vazar pro backend.   |
| `useApp()` entrega 12 valores globais (theme, orgs, users, profiles, assessments, reset…)                                                                                 | "God context" — um único provider com tudo.                                  |
| Navegação por `onNavigate(section: string)` com literais `'admin'`, `'bin'`…                                                                                              | Roteamento _stringly-typed_, sem URL, sem deep-link.                         |

**Consequência:** essa base **não atende** o contrato v2.0 (Next.js + Supabase + Auth + RLS +
roteamento com deep-link). Ela serve como **referência visual/UX** — o layout, os tokens de tema,
o org switcher, o simulador de papéis (ótimo para QA). Mas a fundação (auth, dados, segurança,
rotas) precisa ser **reconstruída** sobre a stack da spec, não adaptada.

Recomendação: **manter o Google AI Studio como protótipo de design/fluxo** e reconstruir na stack
oficial. Não tentar "ligar o Supabase por baixo" desse app — o modelo de estado e de navegação
está incompatível.

---

## 2. SEGURANÇA — vulnerabilidades e riscos

Severidade: 🔴 crítica · 🟠 alta · 🟡 média · 🔵 baixa

### 🔴 S-1. Verifique AGORA se há chave de API embutida no bundle

Apps do Google AI Studio quase sempre nascem com `process.env.API_KEY` / `GEMINI_API_KEY`
referenciada **no código do cliente** (`vite`/`esbuild` inlina no bundle → qualquer visitante lê a
chave no DevTools). Não está neste arquivo, mas é o vazamento nº 1 dessa origem.
**Ação:** `grep -ri "API_KEY\|GEMINI\|apiKey\|process.env" src/` no projeto completo. Se existir
no client, **revogar a chave** e mover toda chamada de IA para o servidor.

### 🔴 S-2. Autorização inteiramente no cliente (privilege escalation por design)

`effectiveRole` e o "Simulador de Papéis" permitem virar `platform_admin` com um clique. Em um
protótipo isolado, tudo bem. **Se esse padrão for para produção**, é escalonamento de privilégio
trivial. Na plataforma real:

- Toda decisão de permissão vem da **RLS do Postgres** + `member_role(org)` no servidor (spec §6.2).
- O front pode _esconder_ botões por papel, mas **nunca é a fonte de verdade**.
- O "simular papel" vira **impersonation server-side, só para `platform_admin`, com `audit_log`**
  e banner permanente "Você está vendo como X".

### 🟠 S-3. Papel derivado de `id.includes('owner' | 'member')`

```js
else if (p.id.includes('owner')) personaRole = 'client_owner';
else if (p.id.includes('member')) personaRole = 'client_member';
```

Se essa mesma heurística existir no `AppContext` ⚠️ _(inferido)_ e for usada para liberar telas,
qualquer perfil cujo ID contenha "owner" ganha permissão de owner. Papel tem que ser **coluna
explícita** (`memberships.role`), nunca inferido de string. Extrair para um único
`getRoleFromProfile(profile): UserRole` e usar RLS como gate real.

### 🟠 S-4. `resetAllData()` no código do cliente

Função que apaga tudo existindo no client é uma bomba. Na plataforma real não existe "reset seed"
no bundle de produção — seed é script de `supabase/seed/` rodado só em dev/staging.

### 🟡 S-5. `<img src={currentUser.avatarUrl}>` e `p.avatarUrl` sem tratamento

- URL externa arbitrária → vaza IP/User-Agent/Referer do usuário para o host da imagem
  (pixel de rastreio, fingerprinting).
- Sem `onError` → imagem quebrada deixa avatar vazio.
  **Correção:** `referrerPolicy="no-referrer"`, `loading="lazy"`, `onError` com fallback para as
  iniciais, e idealmente **proxy/allowlist** de domínios de avatar (ou upload no Supabase Storage).

### 🟡 S-6. `style={{ backgroundColor: activeOrg.accentColor }}` sem validação

`accentColor` é editável pelo admin da org (spec §5.1). React não deixa quebrar para fora da
propriedade, então o risco é baixo, mas: valide que é `^#[0-9a-fA-F]{6}$` na escrita e na leitura
(evita `accentColor` inválido quebrando layout / futura injeção se um dia isso virar CSS string).

### 🟡 S-7. Dropdowns e modal sem `Escape` / click-outside / foco

Além de acessibilidade (seção 4), é um risco de **UI redressing leve**: menus que não fecham ao
perder foco podem ficar "presos" sobre outro conteúdo. Resolver adotando primitivo com
gerenciamento de foco (Radix / Headless UI).

### 🔵 S-8. `ExternalLink` importado e não usado

Sinal de que havia (ou haverá) link externo. Quando entrar: `rel="noopener noreferrer"` +
`target="_blank"` + verificar destino.

### Checklist de segurança para o projeto completo (não dá pra ver só no Topbar)

- [ ] Chave de IA / segredo no bundle do cliente (S-1).
- [ ] Onde os dados persistem? `localStorage` sem criptografia? Há PII (e-mails, faturamento) em claro?
- [ ] Existe qualquer chamada `fetch` para API sem `Authorization` / sem verificação de origem?
- [ ] `dangerouslySetInnerHTML` em qualquer lugar?
- [ ] Dependências: `npm audit` (apps do AI Studio costumam vir com libs desatualizadas).
- [ ] CSP / headers de segurança no `index.html` ou `vite.config` (provavelmente ausentes).
- [ ] Rotas "admin" protegidas só por `if (role === ...)` no componente (bypass via URL).
- [ ] Tokens/IDs previsíveis, dados de outras orgs acessíveis trocando um ID no estado.

---

## 3. BUGS E CRASHES POTENCIAIS

| #   | Onde                                                                          | Problema                                                                                                                                                                                    | Correção                                                                                         |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| B-1 | `activeOrg.name.charAt(0)`, `activeOrg.id`, `activeOrg.accentColor`           | Se `organizations` vazio ou `activeOrgId` inválido → `activeOrg` é `undefined` → **TypeError** que derruba a app inteira (Topbar está em todas as telas).                                   | Guard: `if (!activeОrg) return <TopbarSkeleton/>`. Tipar `activeOrg: Org` só depois de garantir. |
| B-2 | `currentUser.fullName.charAt(0)`, `currentUser.avatarUrl`                     | Mesmo problema se não houver usuário logado. Na plataforma real, Topbar só renderiza dentro de rota autenticada — mas o guard ainda é necessário.                                           | Idem B-1.                                                                                        |
| B-3 | `const orgAssessments = binAssessments.filter(a => a.orgId === activeOrg.id)` | **Calculado e nunca usado** (dead code). Roda `.filter()` a cada render. O comentário "Assessment status" no JSX indica que era pra ter um badge de status do BIN que não foi implementado. | Remover, ou implementar o badge (é um bom recurso — ver F-3).                                    |
| B-4 | Imports `Building2`, `Sparkles`, `ExternalLink`                               | Importados, nunca usados → aumentam bundle, poluem lint.                                                                                                                                    | Remover (ou o linter com `no-unused-vars` pega).                                                 |
| B-5 | `showOrgMenu` e `showUserMenu` independentes                                  | Abrir um **não fecha** o outro; os dois podem ficar abertos sobrepostos.                                                                                                                    | Um único estado `openMenu: 'org' \| 'user' \| null` ou um primitivo Popover.                     |
| B-6 | Classes `shadow-xs`, `backdrop-blur-xs`                                       | Não existem no Tailwind padrão (v3). Se o projeto não as definiu no config, **são ignoradas silenciosamente** → sombra/blur não aparecem.                                                   | Confirmar Tailwind v4 (que tem `xs`) ou trocar por `shadow-sm` / `backdrop-blur-sm`.             |
| B-7 | `animate-in fade-in zoom-in-95`                                               | Sintaxe de `tailwindcss-animate`. Se o plugin não estiver instalado, sem animação (não quebra, mas fica seco).                                                                              | Verificar `tailwind.config` plugins.                                                             |
| B-8 | Modal renderizado **dentro de `<header>`**                                    | `position: fixed` funciona, mas um `dialog` como descendente do landmark `banner` é semântica ruim e pode confundir leitor de tela.                                                         | Portal para `document.body` (Radix Dialog resolve).                                              |

---

## 4. ACESSIBILIDADE (WCAG 2.1 AA) — reprova

| #   | Problema                                                                                                                                    | Critério     | Correção                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| A-1 | Dropdowns: sem `role="menu"`/`menuitem`, sem `aria-expanded`, sem navegação por seta, sem `Escape`, sem click-outside, sem retorno de foco. | 2.1.1, 4.1.2 | Trocar por **Radix DropdownMenu** (ou Headless UI Menu). Resolve tudo de uma vez.                                                 |
| A-2 | Modal de reset: sem `role="dialog"`, `aria-modal`, foco não vai pro modal, `Escape` não fecha, foco não volta ao botão, sem scroll-lock.    | 2.1.2, 2.4.3 | **Radix Dialog** / `AlertDialog`.                                                                                                 |
| A-3 | Botões só com ícone (reset, chevrons) dependem de `title`. `title` não é anunciado de forma confiável.                                      | 4.1.2        | `aria-label` explícito em todos. O toggle de tema já tem ✓.                                                                       |
| A-4 | Textos `text-[10px]` e `text-[11px]` em `--text-3` sobre `--surface-1`. Provável contraste < 4.5:1 e tamanho abaixo do confortável.         | 1.4.3, 1.4.4 | Mínimo 12px para texto secundário; subir `--text-3` ou usar `--text-2` nesses rótulos. Rodar checker de contraste nos dois temas. |
| A-5 | `animate-in ...` sem `motion-reduce:`                                                                                                       | 2.3.3        | Adicionar `motion-reduce:animate-none` ou respeitar `prefers-reduced-motion` global.                                              |
| A-6 | Foco visível: muitos `hover:` sem `focus-visible:` equivalente.                                                                             | 2.4.7        | Anel de foco (`focus-visible:ring-2 ring-[var(--primary)]`) em todo elemento interativo.                                          |
| A-7 | Ordem de foco / tab: com dropdowns manuais, o Tab sai do menu aberto sem fechá-lo.                                                          | 2.4.3        | Resolve com A-1.                                                                                                                  |

---

## 5. ARQUITETURA E ESTADO

| #      | Problema                                                                                                | Impacto                                                                                                                        | Recomendação (alinhada à spec v2.0)                                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ARCH-1 | **God context** `useApp()` com 12 responsabilidades (tema, orgs, users, profiles, assessments, reset…). | Qualquer mudança (ex.: autosave de 1 resposta do BIN) re-renderiza **toda** a árvore que consome `useApp`, inclusive o Topbar. | Separar: `ThemeProvider`, `SessionProvider` (usuário/org ativos), e **dados via `@tanstack/react-query`** (não em contexto). Contexto só para o que é global e raramente muda. |
| ARCH-2 | Navegação `onNavigate(section: string)` + cadeia de ternários pra rótulo.                               | Sem URL, sem voltar/avançar, sem deep-link, sem compartilhar link de uma tela. _Stringly-typed_ = erro só em runtime.          | **Next.js App Router** com rotas reais (`/[orgSlug]/bin/...`). Breadcrumb derivado do pathname. Mapa `SECTION_LABELS: Record<Section, string>` em vez de ternário.             |
| ARCH-3 | `binAssessments.filter()` sem `useMemo`; lógica de `personaRole` recalculada por item a cada render.    | Micro, mas multiplica em listas maiores.                                                                                       | `useMemo`; extrair `getRoleFromProfile`.                                                                                                                                       |
| ARCH-4 | `currentSection: string`, `subSection?: string` — props não tipadas.                                    | Sem autocomplete, sem checagem.                                                                                                | `type Section = 'bin'                                                                                                                                                          | 'min' | 'tarefas' | 'programa' | 'admin' | 'colecao'` etc. |
| ARCH-5 | Persona switcher e `effectiveRole` no client.                                                           | Ver S-2.                                                                                                                       | Real auth (Supabase) + impersonation server-side auditada.                                                                                                                     |
| ARCH-6 | Três `useState` de menu no componente.                                                                  | Estado de UI espalhado.                                                                                                        | Um primitivo Popover/DropdownMenu controla isso; componente não gerencia.                                                                                                      |
| ARCH-7 | Strings PT-BR inline espalhadas.                                                                        | Aceitável no MVP (spec: sem i18n), mas dificulta revisão.                                                                      | Centralizar rótulos de navegação num `config/navigation.ts`.                                                                                                                   |

---

## 6. DESIGN SYSTEM E CONSISTÊNCIA

**Bom (manter):**

- Uso de CSS variables (`--surface-1`, `--border`, `--text-1`, `--primary`, `--brand-lime`) —
  **bate com a spec §11.2**. O protótipo já adotou o design system certo.
- Escala de raio, hierarquia visual do header, o org switcher com inicial colorida.

**Corrigir:**

| #    | Problema                                                                                                                       | Correção                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| DS-1 | Mistura tokens com paleta crua do Tailwind: `bg-rose-500`, `text-amber-400`, `text-indigo-500`, fallback `#6366f1` hard-coded. | Criar tokens semânticos: `--danger`, `--warning`, `--info` (a spec já define). Sem hex solto no JSX. |
| DS-2 | `shadow-xs` / `backdrop-blur-xs` possivelmente inexistentes (B-6).                                                             | Padronizar 2–3 níveis de sombra como tokens.                                                         |
| DS-3 | Tamanhos `text-[10px]`/`[11px]`/`[var(--...)]` arbitrários inline.                                                             | Usar a escala tipográfica da spec §11.3 (12/13/14/16…).                                              |
| DS-4 | Cores dos badges de papel (`RoleBadge`) não auditadas aqui — verificar contraste nos 2 temas.                                  | Incluir na varredura completa.                                                                       |

---

## 7. EXPERIÊNCIA DO CLIENTE / UX — observações e novos recursos

### Problemas de UX no que existe

- **UX-1. Não há logout.** O único controle de identidade é "trocar persona". Um cliente real
  precisa de: nome, foto, **Sair**, "Minha conta", "Ajuda/Suporte".
- **UX-2. "Restaurar dados iniciais" no topo, ao lado do tema.** Ação destrutiva máxima a um
  clique (tem confirmação ✓, mas o gatilho é um ícone minúsculo sem rótulo). Isso **não deve
  existir na visão do cliente** — é ferramenta de dev.
- **UX-3. Sem estados de carregamento/vazio.** Org sem nome, lista de orgs vazia, sem assessments
  → tela quebra ou fica estranha.
- **UX-4. Aperto no mobile.** Org (160px) + persona + 2 badges + 2 ícones no lado direito
  estouram em ~375px. `hidden lg:flex` ajuda só o nome/e-mail.
- **UX-5. Breadcrumb não é clicável** e não reflete hierarquia real (deriva de `currentSection`,
  não da rota).
- **UX-6. O comentário do código promete "Assessment status" que não existe** (B-3).

### Novos recursos recomendados (priorizados)

| Prio | Recurso                                                                                                    | Por quê                                                                     |
| ---- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| P0   | **Menu de conta real** (perfil, Sair, trocar senha, tema) substituindo o persona switcher na visão cliente | Requisito básico de produto; segurança                                      |
| P0   | **Impersonation admin-only auditada** ("Ver como cliente X") com banner fixo                               | Substitui o persona switcher de forma segura; ótimo p/ suporte              |
| P1   | **Badge de status do BIN no topbar** (ex.: "Diagnóstico: 6/10 áreas" → clica e vai pro hub)                | Reduz fricção, lembra o cliente de continuar; o código já ensaiava isso     |
| P1   | **Centro de notificações** (assessment publicado, tarefa atribuída, marco vencendo)                        | Engajamento e recorrência (a spec fala em "alertas proativos")              |
| P1   | **Command palette (⌘K)** — buscar org, tela, coleção, tarefa                                               | Spec §11.4 já prevê como fase 2; acelera consultor que gerencia várias orgs |
| P2   | **Seletor de período** no topbar (mês/ano) ligado ao estado global                                         | Spec §4.1 e §3.2 preveem; dashboards e histórico dependem disso             |
| P2   | **Indicador de "ambiente"** (dev/staging) para nunca confundir com produção                                | Evita reset/edição em base errada                                           |
| P2   | **Atalho "Ajuda / Fale com a Land Grow"**                                                                  | Suporte e retenção                                                          |
| P3   | Densidade/compacto, favoritos de orgs para o consultor, histórico "orgs recentes"                          | Produtividade do time Land Grow                                             |

---

## 8. O QUE O AIOX PRECISA PARA A VARREDURA COMPLETA

Para rodar a análise profunda de verdade (agentes `aiox-qa` + `aiox-architect` + `cyber-chief` +
skill `security-review`), preciso do **projeto inteiro**, não de arquivos avulsos. Escolha um:

1. **Melhor:** commitar o projeto num repositório (novo repo `pulso` ou pasta em `aiox-core`) e
   me apontar o caminho. Aí rodo varredura + `npm audit` + `security-review` + CodeRabbit.
2. Copiar a pasta do app para `CLAUDE DOCS LAND/PULSO/app-google-ai-studio/` (sem `node_modules`).
3. Exportar o zip do Google AI Studio e extrair aqui.

**Arquivos-chave que preciso ver** (é onde estão as respostas que o Topbar só deixou entrever):

- `src/context/AppContext.*` — persistência, auth, cálculo de `effectiveRole`, `resetAllData`.
- `src/types.*` — modelo de dados do protótipo.
- `index.html`, `vite.config.*`, `package.json`, `.env*` — **chaves, deps, headers**.
- Qualquer `src/**/api*`, `src/**/supabase*`, `src/**/*.service.*`, chamadas `fetch`.
- Rotas / roteador (como `onNavigate` é resolvido).
- `src/**/*Admin*` — telas administrativas e seus gates.

Com isso entrego: relatório de vulnerabilidades com severidade CVSS-like, mapa de dívida técnica,
gap-analysis contra a spec v2.0, e um plano de "reaproveitar o quê / reconstruir o quê".

---

## 9. VEREDICTO RÁPIDO

| Dimensão              | Nota                      | Comentário                                                             |
| --------------------- | ------------------------- | ---------------------------------------------------------------------- |
| Design / tokens       | 🟢 Bom                    | Já usa o design system certo; ajustes pontuais (DS-1..4).              |
| Layout / componível   | 🟡 Ok                     | Estrutura visual boa, mas menus/modal precisam de primitivo acessível. |
| Acessibilidade        | 🔴 Reprova                | Dropdowns e modal sem foco/teclado/ARIA.                               |
| Arquitetura de estado | 🔴 Refazer                | God context + navegação stringly-typed incompatíveis com a spec.       |
| Segurança             | 🔴 Crítico (arquitetural) | Autorização no cliente, persona switcher, possível chave no bundle.    |
| Aderência à spec v2.0 | 🟡 Parcial                | Serve como protótipo de UX; fundação (auth/dados/rotas) reconstruída.  |

**Recomendação:** usar como **referência de design e fluxo**, reconstruir a fundação na stack
oficial (Next.js + Supabase + RLS). Não investir em "backendizar" esse protótipo.

---

_AIOX · auditoria preliminar (1 arquivo) · aguardando projeto completo para varredura profunda_
