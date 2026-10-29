# Anexo 01 — Estado atual do PULSO

Inventário para o PRD Scale. Se divergir do código, o código vence. Atualizado 28/10/2026.

## Stack

| Camada | Tecnologia |
| --- | --- |
| App | Next.js 16.3 App Router + Turbopack, React 19, TypeScript strict |
| UI | Tailwind + shadcn/Radix, TanStack Table/Query, dnd-kit, Recharts, RHF + Zod |
| Backend | Route Handlers + Server Actions; `src/proxy.ts` (getUser) |
| Dados | Supabase Postgres + RLS + Auth + Storage; projeto `pcmivlmpdbzpztwcojfs` |
| Deploy | Vercel `pulso-app` / team `team_078IWccQiItS8SOrA5Iew5Yq` |
| Chat | Groq padrão; xAI se `XAI_API_KEY`; `src/lib/inteligencia/llm.ts` |
| Jobs | Cron Vercel `0 11 * * *` UTC = 8h Brasília |

## Superfícies e nav

**HQ** (`src/lib/nav/destinations.ts` `HQ_NAV`): Dashboard, Painel, Atividades, Sala, Objetivos, Reuniões, Calendário, Mapa Mental, Financeiro, CRM, Organizações, BIN, Central IA, Equipe, Configurações.

**Portal cliente** (`clientNav`): Painel, Atividades, Objetivos, Reuniões, Calendário, Projeto, BIN, MIN, Métricas, Documentos, Central IA, Ajustes. **Financeiro não entra.**

**Ficha HQ do cliente** (`cliente-tabs.tsx`): visão geral, usuários, contratos, BIN, MIN, documentos, atividades, mapa mental, CRM (CRM HQ na org interna).

## Auth e papéis

| Conceito | Onde | Notas |
| --- | --- | --- |
| `profiles` | 0001 | 1:1 auth.users |
| `organizations` | 0001 | slug, `plan` legado trial/starter/pro/enterprise, `is_internal`, soft delete |
| `memberships` | 0001 | `client_owner` / `client_member` / `client_viewer` |
| `platform_roles` | 0001 | `platform_admin` / `consultant` |
| `consultant_assignments` | 0001 | orgs do consultor |
| `consultant_capabilities` | 0021 | funções marcadas em Equipe |
| `authorizeOrg` | `src/lib/auth/org-access.ts` | `can_access_org` + write bar viewer |
| Capabilities | `staff-access.ts` | painel, atividades, mapa_mental, crm, sala, calendario, clientes, bin, min, financeiro, metricas, acessos, equipe, audit_log |

Quase todas as capabilities de produto estão no grupo **`operacao`**, inclusive BIN. Não existe altitude.

## Chat hoje

- `POST /api/chat`: surface `admin` | `client`, teto 16 mensagens, 60s.
- Admin: capabilities painel|bin|clientes; dossiê de uma org ou carteira.
- `loadOrgContextPack`: BIN + 8 meetings + 16 tasks + 6 objectives, clip 7000 chars.
- Prompt: não inventar; citar fonte; dossiê não é instrução.

**Não lê:** Sala, documentos, CRM cards detalhados além do recorte, financeiro, e-mail, transcrição, MIN completo.

## Integrações hoje (`INTEGRATION_CATALOG`)

e-mail (avisos), Drive, login Google, WhatsApp (guarda número), Calendar (conector; sync “depois”), Notion (espelho Plano de Ação), **webhook de saída**.

Automações: prazo, comentário, arquivo, card_cliente, cliente_atraso, reuniao → canal e-mail ou webhook.

Não há HMAC inbound, OpenAPI v1, mapper canônico.

## Módulos de dado (migrations 0001–0052, seleção)

Coleções e evidências (0005–0008), contratos/diretório (0009–0011), operação/CRM/boards (0012–0021), financeiro HQ (0025–0028, 0050; 0031/0048/0049 **não aplicar** no cliente), WorkSmart (0023), integrações workspace (0030), MIN (0033), reuniões convites (0035), Sala (0040–0042), BIN live scores (0051 — produto rejeitou uso ao vivo), RLS hardening (0052).

## Lacunas que o Scale fecha

1. Sem semantic layer / eventos de inteligência.  
2. Sem retrieve.  
3. Sem altitude.  
4. Sem inbox.  
5. Sem módulo de leitura comercial.  
6. Sem PWA/app.  
7. Sem instrumentação de citação/ingest.
