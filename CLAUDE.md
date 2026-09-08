# CLAUDE.md — PULSO Platform

PULSO é a plataforma de inteligência de negócios da Land Grow.

---

## Stack Tecnológico

| Camada      | Tecnologia                                       |
| ----------- | ------------------------------------------------ |
| Framework   | Next.js 16.3.4 App Router + Turbopack + React 19 |
| Linguagem   | TypeScript strict                                |
| UI          | TailwindCSS + shadcn/ui (Radix)                  |
| Tabelas     | TanStack Table + TanStack Query                  |
| Drag & Drop | dnd-kit                                          |
| Gráficos    | Recharts                                         |
| Forms       | react-hook-form + Zod                            |
| Backend     | Supabase (Postgres + RLS + Auth + Storage)       |
| Deploy      | Vercel                                           |

---

## Estrutura do Projeto

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/           # Rotas de autenticação
│   ├── (dashboard)/      # Rotas autenticadas
│   ├── api/              # Route Handlers
│   └── layout.tsx        # Layout raiz
├── components/            # Componentes React
│   ├── ui/              # shadcn/ui
│   ├── bin/             # Módulo BIN
│   ├── min/             # Módulo MIN
│   └── collections/      # Motor de coleções
├── lib/                  # Utilitários
│   ├── supabase/        # Cliente Supabase
│   └── ...
└── types/               # Tipos TypeScript
```

---

## Convenções de Código

- **Componentes:** PascalCase (`Dashboard.tsx`)
- **Hooks:** prefixo `use` (`useAuth.ts`)
- **Arquivos:** kebab-case (`user-profile.tsx`)
- **Imports:** absolutos com `@/` (`@/components/ui/button`)
- **Sem `any`:** usar tipos explícitos ou `unknown` com guards
- **Server Components por padrão:** marcar explicitamente com `'use client'`
- **Validação:** Zod schemas em todas as APIs e formulários

---

## Arquitetura de Segurança

### RLS (Row Level Security)

- **default-deny:** toda tabela de tenant começa negando tudo
- **Funções utilitárias:** `is_platform_admin()`, `is_member_of(org_id)`, `member_role(org_id)`
- **org_id:** UUID do banco, nunca slug em chaves estrangeiras

### Papéis

| Papel            | Escopo                                |
| ---------------- | ------------------------------------- |
| `platform_admin` | Todas as organizações                 |
| `consultant`     | Organizações atribuídas               |
| `client_owner`   | Própria organização                   |
| `client_member`  | Própria organização                   |
| `client_viewer`  | Própria organização (somente leitura) |

### Autenticação

- Email + senha com confirmação obrigatória
- Cookies httpOnly via `@supabase/ssr`
- Nunca token nem chave no HTML/JS servido ao cliente

---

## Fluxo de Desenvolvimento (Story-Driven)

1. **Criar Epic** → pasta `docs/stories/epics/epic-N/`
2. **Criar Story** → arquivo `epic-N.story-N.md`
3. **Validar** → PO valida (GO/NO-GO)
4. **Implementar** → Dev implementa (Ready → InProgress → InReview)
5. **Revisar** → QA revisa (QA Gate: PASS/CONCERNS/FAIL)
6. **Concluir** → DevOps faz merge

### Quality Gates

```bash
npm run lint        # ESLint
npm run typecheck  # TypeScript
npm run test       # Jest
npm run build      # Next.js build
```

---

## Épicos do Projeto

| Épico | Escopo                               | Status                                                                                                                                          |
| ----- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Fundação: Auth + RLS + Shell Next.js | ✅ Concluído                                                                                                                                    |
| 1     | Motor de Coleções                    | 🔄 Todas as 8 stories implementadas — 1.1✅ 1.2✅ 1.3✅ 1.4✅ 1.5🟡 1.6🟡 1.7✅ 1.8🟡 (só falta setup manual: usuário de teste + Postgres real) |
| 2     | BIN + Reconciliação                  | ⏳ Pendente                                                                                                                                     |
| 3     | MIN (13 blocos)                      | ⏳ Pendente                                                                                                                                     |
| 4     | Programa + Tarefas                   | ⏳ Pendente                                                                                                                                     |
| 5     | Hardening + LGPD + e2e               | ⏳ Pendente                                                                                                                                     |

---

## Referências

- **System Prompt completo:** `docs/PULSO-SYSTEM-PROMPT.md`
- **Schema BIN:** `src/data/bin-question-bank.ts`
- **Modelo de dados:** `docs/DATA-MODEL.md`

---

_Última atualização: 05/09/2026_

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
