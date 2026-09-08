# Épico 0 — Fundação: Auth, RLS, Shell Next.js

**Data de criação:** 05/09/2026
**Prioridade:** CRÍTICA (bloqueia todos os demais épicos)
**Status:** 🔄 Em progresso

---

## Objetivo

Estabelecer a **fundação técnica completa** do PULSO, garantindo que todos os épicos subsequentes (Motor de Coleções, BIN, MIN, Programa) tenham uma base sólida e segura para construir.

---

## Escopo (dentro do épico)

### 0.1 — Setup do Projeto Next.js 15

- [ ] Inicializar Next.js 15 com App Router
- [ ] Configurar TypeScript strict mode
- [ ] Configurar ESLint + Prettier
- [ ] Configurar TailwindCSS + tokens do design system
- [ ] Configurar shadcn/ui (componentes base)
- [ ] Estrutura de pastas `@/` (src/_, components/_, lib/*)

### 0.2 — Supabase Auth (email + senha)

- [ ] Configurar cliente Supabase para Server e Client Components
- [ ] Página `/login` (form com validação Zod)
- [ ] Página `/register` (form com validação Zod)
- [ ] Confirmação de e-mail obrigatória
- [ ] Recuperação de senha
- [ ] Middleware de proteção de rotas
- [ ] Logout funcional

### 0.3 — RLS default-deny em todas as tabelas de tenant

- [ ] Migration inicial: tabelas base (`organizations`, `profiles`, `memberships`)
- [ ] Funções utilitárias: `is_platform_admin()`, `is_member_of(org_id)`, `member_role(org_id)`
- [ ] RLS habilitado em todas as tabelas de tenant
- [ ] Seed: criar primeira organização + admin

### 0.4 — Shell da Aplicação

- [ ] Layout raiz (`app/layout.tsx`) com tema dark/light toggle
- [ ] Sidebar de navegação principal
- [ ] Header com perfil do usuário + logout
- [ ] Componente de toast/notification
- [ ] Loading states (skeletons)
- [ ] Error boundaries

### 0.5 — Multi-tenant (organizações)

- [ ] Schema `organizations` com UUID
- [ ] Schema `memberships` (user_id, org_id, role)
- [ ] Schema `profiles` (user_id, name, is_platform_admin)
- [ ] Contexto de organização ativa
- [ ] Seletor de organização (multi-tenant)

### 0.6 — LGPD básico

- [ ] Consentimento no cadastro (checkbox obrigatório)
- [ ] Página de política de privacidade
- [ ] Schema `audit_log` com triggers
- [ ] Função de export de dados pessoais (preparar para Épico 5)

### 0.7 — CI/CD + Quality Gates

- [ ] GitHub Actions: lint, typecheck, test, build no push
- [ ] Vercel deployment automático
- [ ] Preview deploys em PRs
- [ ] Branch protection rules

---

## Fora do Escopo (outros épicos)

| Item                                 | Épico   |
| ------------------------------------ | ------- |
| Motor de coleções completo           | Épico 1 |
| Hub BIN com 10 áreas                 | Épico 2 |
| Hub MIN com 13 blocos                | Épico 3 |
| Gestor de tarefas                    | Épico 4 |
| Reconciliação automática             | Épico 2 |
| Otimizações avançadas de performance | Épico 5 |
| E2E tests completos                  | Épico 5 |

---

## Critérios de Conclusão (DoD)

- [ ] `npm run build` passa sem erros
- [ ] `npm run lint` passa sem warnings
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run test` passa com 100% de cobertura nas funções de auth/RLS
- [ ] Deploy no Vercel funciona
- [ ] Login + registro + logout funcionam end-to-end
- [ ] RLS impede leitura de dados de outra organização
- [ ] Tema dark/light funciona
- [ ] Documentação técnica (`docs/DATA-MODEL.md`, `docs/AUTH.md`) está completa

---

## Stories do Épico

| Story | Título                                            | Status          |
| ----- | ------------------------------------------------- | --------------- |
| 0.1   | Setup Next.js 15 + TypeScript + Tailwind + shadcn | 🔄 Em progresso |
| 0.2   | Supabase Auth (email + senha + confirmação)       | ⏳ Pendente     |
| 0.3   | RLS default-deny + funções utilitárias            | ⏳ Pendente     |
| 0.4   | Shell da aplicação (layout + sidebar + header)    | ⏳ Pendente     |
| 0.5   | Multi-tenant (organizations + memberships)        | ⏳ Pendente     |
| 0.6   | LGPD básico (consentimento + audit log)           | ⏳ Pendente     |
| 0.7   | CI/CD + Quality Gates                             | ⏳ Pendente     |

---

## Riscos

| Risco                       | Mitigação                                    |
| --------------------------- | -------------------------------------------- |
| RLS permissiva por descuido | Code review focado em políticas RLS + testes |
| Performance do middleware   | Cache de sessão, refresh strategy            |
| Migração incompleta         | Script de migration + rollback documentado   |
| Auth UX confusa             | Testes de usabilidade com 3+ personas        |

---

## Referências

- **System Prompt PULSO v2.1** — seções 4 (arquitetura), 5 (dados), 6 (segurança)
- **AIOX Story-Driven Development** — `docs/framework/story-locations.md`
- **Supabase Auth docs** — https://supabase.com/docs/guides/auth
- **Next.js 15 App Router** — https://nextjs.org/docs/app

---

_Criado por Morgan (@pm) · Aprovado por Nayara · Squad AIOX em ação_
