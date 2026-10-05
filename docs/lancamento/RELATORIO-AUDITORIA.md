# Relatório da varredura final — PULSO

Data: 05/10/2026. Conduzida seguindo as tarefas do AIOX (Quinn/QA: `security-audit`, `qa-security-checklist`,
`db-rls-audit`, `qa-nfr-assess`; DevOps: `pre-push-quality-gate`, `repository-cleanup`).

## Resumo

| Área                                   | Resultado                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Dependências em produção               | **0 vulnerabilidades** (Next 16.3.4 → 16.3.8 corrigiu falha crítica de execução remota)                        |
| Dados expostos a visitante sem login   | **Nenhum** (37 tabelas testadas com a chave pública; Storage bloqueado)                                        |
| Rotas e APIs sem login                 | **29/29 rotas protegidas**; APIs exigem credencial; cron recusa segredo errado                                 |
| Segredos no Git e no histórico         | **Nenhum** (só placeholders)                                                                                   |
| Qualidade (tipos, lint, testes, build) | Tipos ✔, lint 0 erros, 316 testes ✔, build de produção ✔, 18 testes de páginas públicas ✔ (Chromium + Firefox) |
| Pendências que dependem de você        | 4 bloqueadores (abaixo)                                                                                        |

## Bloqueadores antes do domínio

1. **Cadastro público do Supabase está aberto** (`disable_signup: false`). Desligar em Authentication → Sign In / Providers.
2. **CNPJ de exemplo** nas páginas de Privacidade e Termos (`XX.XXX.XXX/0001-XX`).
3. **Limite de arquivo do Supabase**: global em 50 MB no plano gratuito; o PULSO aceita 200 MB.
4. **E-mails de aviso** ainda sem Resend/domínio verificado.

## O que foi corrigido nesta varredura

- Next.js 16.3.4 → 16.3.8 (e `eslint-config-next`): falha crítica em `next/og` (o app não usa, mas ficou corrigido).
- Removido o cabeçalho `X-Powered-By` (não anunciar a tecnologia).
- `robots.txt` bloqueando indexação + `noindex` em todas as páginas (plataforma privada).
- Removidos 5 ícones de exemplo do Next e uma cópia pública de auditoria de design (`public/motion-audit.html`).
- Removido `src/lib/env.ts` (código morto, nunca importado).
- Teste e2e desatualizado corrigido ("Esqueceu a senha?").
- Organização de pastas:
  - `docs/produto/` — PRD, arquitetura, motor de ingestão, BIN integrado, etc. (antes soltos na raiz; referências atualizadas).
  - `docs/auditorias/` — auditorias de front e de formulários.
  - `docs/comercial/` — pitch de investidor, descrição AWS, apresentações (**fora do Git**).
  - `_legado/` — protótipo antigo da raiz (`api/`, `views/`, `app.js`, `index.html`, `fluent forms/`…), já ignorado pelo Git e pela Vercel.

## Evidências dos testes de segurança

- Chave pública (anon) lendo 37 tabelas → 200 com 0 linhas em todas (RLS ativa).
- Funções de banco chamadas como visitante: `find_user_id_by_email` → **permission denied**; `admin_*` → "Acesso negado".
- Upload anônimo no bucket `evidencias` → **403 (row-level security)**. Bucket privado.
- `/auth/callback?next=https://evil.com` e `next=//evil.com` → não redirecionam para fora.
- `/.env`, `/.git/config`, `/package.json`, `/src/...` → exigem login (307); sem source maps no build.
- Cabeçalhos: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy presentes.
- Auto-login de desenvolvimento só roda com `NODE_ENV=development` (inerte em produção).
- Todas as ações do servidor passam por checagem de permissão (autorização por organização).

## Verificação feita no banco de produção (SQL Editor, 05/10/2026)

- **Funções chamáveis sem login (bloco 1):** 18, todas protegidas por dentro: `admin_*` e `get_or_create_default_board`
  recusam quem não tem papel/acesso ("Acesso negado"); `can_*`, `is_*`, `member_role`, `has_org_role`, `staff_can` são
  predicados que só respondem sobre o próprio usuário logado (visitante recebe `false`); `handle_new_user`, `log_audit` e
  `archive_colecao_revision` são funções de gatilho. Nenhuma escreve dado sem checar quem chama. As perigosas
  (`cleanup_*`, `find_user_id_by_email`, `list_periods_for_org`) estão fechadas pela migração 0034.
- **Políticas (bloco 3):** nenhuma `USING (true)`. As listadas estão em papel `public`, mas todas filtram por
  `can_access_org`/`can_access_board`/`staff_can`, que dependem de `auth.uid()` (visitante não passa).
- **`log_audit` corrigida** (migração 0034 reaplicada depois da 0003).
- **Não verificado ainda:** bloco 2 (tabelas sem RLS; o teste com a chave pública já mostrou 0 linhas nas 37 tabelas) e
  bloco 6 (contas criadas sem convite).

## Riscos residuais (aceitáveis, mas saiba deles)

- **Proteção contra tentativas de senha** é em memória por instância (fraca na Vercel). O Supabase tem limite próprio; considerar Vercel Firewall.
- `/preview` (protótipo do kanban com o questionário BIN) é **público**. Sem dados de cliente, mas expõe o conteúdo do BIN. Decisão de negócio: manter como demonstração ou exigir login.
- CSP usa `'unsafe-inline'` em scripts (necessário no App Router sem nonce).
- Vulnerabilidades restantes no `npm audit` são só de ferramentas de desenvolvimento (vitest/lint-staged), não vão para produção.
- Sem monitoramento de erros em produção (considerar Sentry/Vercel Observability).
- Migração `0024` (função `staff_due_cards`) não está no banco; o app usa caminho alternativo.

## NÃO testado (precisa de uma sessão logada)

Fluxos com login: cada tela do portal do cliente e do admin, criação/edição/exclusão de tarefas, anexos, drive de Documentos,
convites e redefinição de senha ponta a ponta, notificações. O Playwright autenticado não foi executado porque entraria numa conta
real do Supabase de produção. Cobertos por 316 testes unitários e pelos testes manuais feitos durante o desenvolvimento.
