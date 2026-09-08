# `src/components/collections/`

Componentes do Motor de Coleções (Épico 1). Organizados por sub-feature —
cada pasta corresponde a uma story:

```
formulario/    Story 1.3 — Formulário estruturado com auto-save
upload/        Story 1.4 — Upload de arquivos (PDF/Excel/CSV)
texto/         Story 1.5 — Texto livre (áudio adiado, ver docs/stories/.../1.5.story.md)
historico/     Story 1.6 — Timeline de versões + rollback
periodo/       Story 1.7 — Visualização consolidada do período
```

## Convenções

- **Server vs Client Components**: as `page.tsx` (em `src/app/(dashboard)/...`)
  são Server Components que buscam dados via server actions
  (`src/app/actions/*.ts`) e passam pra componentes client-side aqui dentro.
  Componentes que precisam de estado/interação (`useState`, `onClick`, forms)
  levam `"use client"` no topo — a maioria desta pasta.
- **Reuso entre stories**: quando um componente de uma story já resolve o
  que outra precisa, ele é reaproveitado direto em vez de duplicado — ex:
  `upload/file-list.tsx` (Story 1.4) é usado tanto na página de upload quanto
  na página de período consolidado (`periodo/lista-evidencias-periodo.tsx`,
  Story 1.7, é só um wrapper fino que dá estado local a ela).
- **Orquestração de estado**: quando uma page.tsx precisa compartilhar estado
  entre um formulário e uma lista (criar → aparecer na lista sem reload), um
  componente `*-page-client.tsx` no meio segura esse estado — ver
  `texto/texto-page-client.tsx`.
- **Sem componente de toast próprio**: usa [sonner](https://sonner.emotion.sh/)
  (`import { toast } from "sonner"`) em todo lugar — não existe (e não deve
  ser recriado) um sistema de toast Radix próprio; um já foi removido por
  estar morto e sem uso (ver Change Log da Story 1.3).
- **Confirmação de ações destrutivas**: `window.confirm()` simples (ex:
  excluir arquivo, excluir texto, restaurar revision) — não há um componente
  de diálogo de confirmação genérico neste projeto. Pra confirmações com mais
  contexto/resumo (ex: "Marcar como pronto para análise"), usa-se o `Sheet`
  já existente em `src/components/ui/sheet.tsx` (Radix Dialog por baixo).

## Onde estão os testes

- `tests/lib/validations/*.test.ts` — schemas Zod de cada tipo de coleção.
- `tests/lib/actions/*.test.ts` — schemas internos das server actions
  (recriados no teste, sem mockar o Supabase — é a convenção deste projeto).
- `tests/components/*.test.tsx` — testes de render/interação via Testing
  Library + jsdom (ainda cobrem só uma fração dos componentes desta pasta —
  ver `docs/stories/epics/epic-1-collections/1.8.story.md`).
- `tests/e2e/*.spec.ts` — a maioria só confirma o redirect de usuário
  não-autenticado; `collections-flow.spec.ts` tem os fluxos autenticados de
  verdade, mas precisa do setup em `docs/testing/e2e-setup.md` pra rodar.
