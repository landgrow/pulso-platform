# Setup do usuário de teste para e2e (Story 1.8)

Os testes em `tests/e2e/collections-flow.spec.ts` exercitam fluxos autenticados
de verdade (login → criar período → upload → etc.), diferente dos outros specs
em `tests/e2e/`, que só confirmam que um usuário não-autenticado é redirecionado
pro login. Pra isso, precisam de um usuário e uma organização de teste
**dedicados** — nunca um cliente real.

Sem esse setup, os testes em `collections-flow.spec.ts` são **pulados
automaticamente** (não falham) — então isso é opcional pra manter o projeto
funcionando, mas necessário pra cobrir de verdade a AC-2 da Story 1.8.

---

## Passo 1 — Criar o usuário de teste

Escolha UMA das duas opções:

### Opção A — pelo próprio formulário de cadastro do app

1. Rode o app localmente (`npm run dev`) ou acesse o ambiente de staging.
2. Vá em `/register` e crie uma conta com um e-mail dedicado, por exemplo
   `e2e-test@landgrow.com.br`.
3. Confirme o e-mail se o projeto exigir confirmação (verifique a caixa de
   entrada, ou desative a confirmação obrigatória nas configurações de Auth
   do Supabase só pra esse ambiente, se for de teste).

### Opção B — direto no Supabase Dashboard

1. Supabase Dashboard → **Authentication** → **Users** → **Add user**.
2. Preencha e-mail e senha. Marque **Auto Confirm User** pra pular a
   confirmação por e-mail.

---

## Passo 2 — Colocar as credenciais no `.env.local`

Abra `.env.local` (nunca `.env.local.example` — esse é só o template) e
preencha:

```bash
PULSO_E2E_EMAIL=e2e-test@landgrow.com.br
PULSO_E2E_PASSWORD=<a senha que você escolheu no Passo 1>
PULSO_E2E_ORG_SLUG=e2e-test
```

`.env.local` já está no `.gitignore` — essas credenciais nunca vão pro Git.

Se for configurar isso no CI (GitHub Actions), adicione as mesmas 3 variáveis
como **Secrets** do repositório (`Settings → Secrets and variables → Actions`):
`PULSO_E2E_EMAIL`, `PULSO_E2E_PASSWORD`, `PULSO_E2E_ORG_SLUG`. O workflow
(`.github/workflows/ci.yml`, job `e2e-tests`) já está preparado pra usá-las.

**Importante:** o job `e2e-tests` builda o app contra
`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` — pra login de
verdade funcionar em CI, esses dois secrets também precisam apontar pro
projeto Supabase real (o mesmo do seed), não pro placeholder. Se o job
`quality-gates` já tem esses dois secrets configurados, nada a fazer — são
compartilhados entre jobs do mesmo workflow.

---

## Passo 3 — Rodar o seed de dados

Isso cria a organização e o cliente de teste, e vincula o usuário do Passo 1
como `client_owner` dessa organização — **sem precisar saber o UUID do
usuário**, o script acha pelo e-mail.

1. Abra `db/seed-test-data.sql`.
2. Edite as duas linhas marcadas `EDITE AQUI` (e-mail e slug) pra baterem com
   o que você usou no Passo 1/2.
3. Rode o arquivo inteiro:
   - **Supabase Dashboard**: SQL Editor → cole o conteúdo do arquivo → Run.
   - **Ou via psql**: `psql "$DATABASE_URL" -f db/seed-test-data.sql`
     (`DATABASE_URL` fica em Supabase Dashboard → Project Settings →
     Database → Connection string).
4. O script é idempotente — pode rodar de novo sem duplicar nada.

---

## Passo 4 — Rodar os testes

```bash
npx playwright test tests/e2e/collections-flow.spec.ts
```

Se as 3 variáveis de ambiente não estiverem preenchidas, os 5 testes aparecem
como **skipped**, não como falha — é o comportamento esperado pra quem ainda
não fez esse setup.

---

## O que NÃO fazer

- Não use um e-mail/organização real de cliente pra isso — os testes criam e
  editam dados de verdade (período, formulário, upload) na organização de
  teste toda vez que rodam.
- Não commite `.env.local` nem cole a senha em nenhum lugar do repositório.
- Não reaproveite esse usuário pra login manual no dia a dia — ele existe só
  pro CI/testes locais.
